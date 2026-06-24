import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  HttpException,
  Logger,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { JwtGuard } from "../../common/auth/jwt.guard";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Roles } from "../../common/auth/roles.decorator";
import {
  CurrentUser,
  JwtPayload,
} from "../../common/auth/current-user.decorator";
import { AiService, EmployeeSummary } from "./ai.service";
import { EmailService } from "./email.service";
import { EmailRepository } from "./email.repository";
import { UsersRepository } from "../users/users.repository";
import { ComposeEmailDto } from "./dto/compose-email.dto";
import { SendEmailDto } from "./dto/send-email.dto";
import { fuzzyMatchScore, resolveRecipient } from "./recipient-resolver";

// Re-export for use in tests that import from this module
export { fuzzyMatchScore, resolveRecipient };

/**
 * Maximum number of employees fetched when building the active list for
 * AI-based recipient matching. 1 000 covers all realistic org sizes; raise
 * this constant (and add cursor pagination) if the company exceeds that.
 */
const MAX_EMPLOYEES_FOR_MATCHING = 1000;

/**
 * Per-route throttle limit for AI email endpoints (compose + send).
 * In test env (NODE_ENV=test) the limit is raised to 100 000 so integration
 * tests are never blocked. In production the effective limit is 5/60 s.
 */
const EMAIL_THROTTLE_LIMIT = process.env.NODE_ENV === "test" ? 100_000 : 5;

const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

@Controller("api/email")
@UseGuards(JwtGuard, RolesGuard)
@Roles("super_admin")
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly emailService: EmailService,
    private readonly emailRepository: EmailRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  /**
   * POST /api/email/compose
   *
   * Calls AiService to extract draft from prompt, then matches the recipient
   * name against the active employee list.
   *
   * If selectedRecipientId is supplied, skip AI matching and resolve
   * directly from the employee list.
   *
   * Never sends email — only returns a draft for CEO review.
   *
   * Rate limit: 5 requests per 60 s via the 'email' ThrottlerModule bucket
   * (stricter than the global 100/min because each call triggers a paid AI
   * API request). Limit is raised to 100 000 in test env (NODE_ENV=test).
   */
  @Post("compose")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: EMAIL_THROTTLE_LIMIT, ttl: 60000 } })
  async compose(@Body() dto: ComposeEmailDto): Promise<{
    recipient: { userId: string; email: string; name: string } | null;
    requiresRecipientSelection: boolean;
    subject: string;
    body: string;
    reportLink: string | null;
    candidates?: EmployeeSummary[];
  }> {
    // Fetch active employees for recipient matching
    const { rows: employees } = await this.usersRepository.findAll({
      page: 1,
      limit: MAX_EMPLOYEES_FOR_MATCHING,
    });

    const activeSummaries: EmployeeSummary[] = employees
      .filter((e) => e.isActive)
      .map((e) => ({ id: e.id, name: e.name, email: e.email }));

    // Build report link if reportId provided
    const reportLink = dto.reportId
      ? `${APP_BASE_URL}/reports/${dto.reportId}`
      : null;

    // --- Case 1: CEO explicitly selected a recipient ---
    if (dto.selectedRecipientId) {
      const chosen = activeSummaries.find(
        (e) => e.id === dto.selectedRecipientId,
      );
      if (!chosen) {
        throw new BadRequestException({
          code: "BAD_REQUEST",
          message:
            "selectedRecipientId không tìm thấy trong danh sách nhân viên active",
        });
      }

      // Still call AI for subject + body even with explicit recipient selection
      let draft: { subject: string; body: string };
      try {
        draft = await this.aiService.composeEmailDraft(
          dto.prompt,
          activeSummaries,
        );
      } catch (err) {
        throw new HttpException(
          {
            code: "SERVICE_UNAVAILABLE",
            message:
              "AI service không khả dụng — không thể soạn nội dung email",
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return {
        recipient: {
          userId: chosen.id,
          email: chosen.email,
          name: chosen.name,
        },
        requiresRecipientSelection: false,
        subject: draft.subject,
        body: draft.body,
        reportLink,
      };
    }

    // --- Case 2: AI-assisted compose ---
    let draft: { recipientName: string; subject: string; body: string };
    try {
      draft = await this.aiService.composeEmailDraft(
        dto.prompt,
        activeSummaries,
      );
    } catch (err) {
      this.logger.error("AI compose failed", err);
      throw new HttpException(
        {
          code: "SERVICE_UNAVAILABLE",
          message: "AI service không khả dụng — không thể soạn nội dung email",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const resolution = resolveRecipient(draft.recipientName, activeSummaries);

    if ("match" in resolution) {
      return {
        recipient: {
          userId: resolution.match.id,
          email: resolution.match.email,
          name: resolution.match.name,
        },
        requiresRecipientSelection: false,
        subject: draft.subject,
        body: draft.body,
        reportLink,
      };
    }

    // Ambiguous / no match — return candidate list for CEO to choose
    return {
      recipient: null,
      requiresRecipientSelection: true,
      subject: draft.subject,
      body: draft.body,
      reportLink,
      candidates: resolution.candidates,
    };
  }

  /**
   * POST /api/email/send
   *
   * Multipart form: text fields (recipientUserId, subject, body, reportId?)
   * + optional file attachments.
   *
   * Validates that recipientUserId is an active employee, builds the email
   * (appending a report link when reportId is supplied), attaches any uploaded
   * files, sends via EmailService (Gmail SMTP), and writes a row to email_logs.
   *
   * On SMTP failure: writes a failed log entry and returns a clear error
   * (does NOT crash — the app remains operational).
   *
   * Rate limit: 5 requests per 60 s via the 'email' ThrottlerModule bucket
   * to prevent email flooding. Limit is raised to 100 000 in test env.
   */
  @Post("send")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor("files", 10))
  @Throttle({ default: { limit: EMAIL_THROTTLE_LIMIT, ttl: 60000 } })
  async send(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: SendEmailDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ): Promise<{ messageId: string; logId: string }> {
    // Validate recipient is an active employee
    const recipient = await this.usersRepository.findById(dto.recipientUserId);
    if (!recipient) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Nhân viên không tồn tại trong hệ thống",
      });
    }
    if (!recipient.isActive) {
      throw new BadRequestException({
        code: "BAD_REQUEST",
        message: "Nhân viên này hiện không active — không thể gửi email",
      });
    }

    // Build email body (append report link if provided)
    let emailHtml = dto.body.replace(/\n/g, "<br>");
    if (dto.reportId) {
      const reportLink = `${APP_BASE_URL}/reports/${dto.reportId}`;
      emailHtml += `<br><br>Xem báo cáo tại: <a href="${reportLink}">${reportLink}</a>`;
    }

    // Build attachments from uploaded files
    const attachments = (files ?? []).map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    const attachmentsCount = attachments.length;
    let messageId = "";

    try {
      const result = await this.emailService.sendMail({
        to: recipient.email,
        subject: dto.subject,
        html: emailHtml,
        text:
          dto.body +
          (dto.reportId
            ? `\n\nXem báo cáo: ${APP_BASE_URL}/reports/${dto.reportId}`
            : ""),
        attachments,
      });
      // EmailService.sendMail returns void; use a generated ID for consistency
      messageId = result ?? "sent";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.error(`SMTP send failed: ${errorMessage}`, err);

      // Write failed log — must not throw again
      const log = await this.emailRepository.insertLog({
        senderId: currentUser.sub,
        recipientUserId: recipient.id,
        recipientEmail: recipient.email,
        subject: dto.subject,
        body: dto.body,
        reportId: dto.reportId ?? null,
        attachmentsCount,
        status: "failed",
        error: errorMessage,
      });

      throw new HttpException(
        {
          code: "EMAIL_SEND_FAILED",
          message: `Gửi email thất bại: ${errorMessage}`,
          logId: log.id,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Write success log
    const log = await this.emailRepository.insertLog({
      senderId: currentUser.sub,
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      subject: dto.subject,
      body: dto.body,
      reportId: dto.reportId ?? null,
      attachmentsCount,
      status: "success",
      error: null,
    });

    return { messageId: messageId || "mock-msg-id", logId: log.id };
  }
}
