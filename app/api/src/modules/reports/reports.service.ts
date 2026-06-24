import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { S3Service } from "../../infra/s3.service";
import { AssignmentsService } from "../assignments/assignments.service";
import { ReportsRepository, ReportRow } from "./reports.repository";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import * as crypto from "crypto";

/** Max file size for HTML uploads (default 70 MB). Configurable via env. */
const MAX_HTML_BYTES =
  parseInt(process.env.REPORT_MAX_SIZE_BYTES ?? "0", 10) || 70 * 1024 * 1024;

export interface ReportDto {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  s3Key: string | null;
  sizeBytes: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Number of employees assigned to this report (0 when none). */
  assigneeCount: number;
}

function toDto(row: ReportRow): ReportDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    s3Key: row.s3_key,
    sizeBytes: row.size_bytes,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    // assignee_count comes from the LEFT JOIN COUNT in repository queries;
    // default to 0 for mutations (create/update) that return bare ReportRow without the join.
    assigneeCount: row.assignee_count ?? 0,
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportsRepo: ReportsRepository,
    private readonly s3: S3Service,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers — HTML validation
  // ---------------------------------------------------------------------------

  private validateHtmlBuffer(buf: Buffer, mimeType: string): void {
    if (!mimeType.startsWith("text/html")) {
      throw new BadRequestException("Chỉ chấp nhận file HTML");
    }
    if (buf.length > MAX_HTML_BYTES) {
      throw new BadRequestException(
        `Kích thước file vượt quá giới hạn ${MAX_HTML_BYTES / 1024 / 1024}MB`,
      );
    }
  }

  private buildS3Key(reportId: string): string {
    return `reports/${reportId}/${Date.now()}.html`;
  }

  // ---------------------------------------------------------------------------
  // CREATE — S3 first, then INSERT (no orphan risk)
  //
  // Strategy (a) per code-review: generate the UUID client-side, upload to S3
  // with the real key, then INSERT the DB row with the real s3_key.
  // If S3 fails before the INSERT there is no DB row to clean up.
  // If DB INSERT fails after S3 the object is in S3 but inaccessible (harmless
  // orphan in object storage — no broken FK, no dangling row in DB).
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateReportDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<ReportDto> {
    let htmlBuf: Buffer;
    let mimeType: string;

    if (file) {
      // Multipart file upload
      htmlBuf = file.buffer;
      mimeType = file.mimetype;
    } else if (dto.htmlContent) {
      // JSON body flow (FR7.2)
      htmlBuf = Buffer.from(dto.htmlContent, "utf8");
      mimeType = "text/html";
    } else {
      throw new BadRequestException("Phải cung cấp file HTML hoặc htmlContent");
    }

    this.validateHtmlBuffer(htmlBuf, mimeType);

    // Generate a deterministic ID and S3 key BEFORE touching the DB.
    // This way: S3 upload → INSERT with real key (no 'pending' state).
    const reportId = crypto.randomUUID();
    const s3Key = this.buildS3Key(reportId);

    // Upload to S3 first — if this throws, nothing hits the DB.
    await this.s3.putHtml(s3Key, htmlBuf.toString("utf8"));

    // Insert DB row with the real s3_key from the start.
    // status is always 'published' — client cannot override on create.
    const report = await this.reportsRepo.createWithId({
      id: reportId,
      title: dto.title,
      description: dto.description,
      status: "published",
      s3Key,
      sizeBytes: htmlBuf.length,
      createdBy: userId,
    });

    this.logger.log(`Report created id=${reportId} s3Key=${s3Key}`);
    return toDto(report);
  }

  // ---------------------------------------------------------------------------
  // UPDATE — upload new S3 object before updating DB reference
  //
  // Safety: we compute the new key and upload BEFORE calling repo.update().
  // If the upload fails the DB still holds the old (valid) s3_key.
  // If the DB update fails after the upload, the new S3 object is orphaned in
  // object storage (harmless) and the DB row keeps the old working key.
  // ---------------------------------------------------------------------------

  async update(
    id: string,
    dto: UpdateReportDto,
    file: Express.Multer.File | undefined,
  ): Promise<ReportDto> {
    const existing = await this.reportsRepo.findById(id);
    if (!existing) throw new NotFoundException("Báo cáo không tìm thấy");

    const updateData: Parameters<ReportsRepository["update"]>[1] = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;

    // Handle HTML replacement — upload to S3 BEFORE updating the DB record.
    let htmlBuf: Buffer | undefined;
    let mimeType: string | undefined;

    if (file) {
      htmlBuf = file.buffer;
      mimeType = file.mimetype;
    } else if (dto.htmlContent !== undefined) {
      htmlBuf = Buffer.from(dto.htmlContent, "utf8");
      mimeType = "text/html";
    }

    if (htmlBuf && mimeType) {
      this.validateHtmlBuffer(htmlBuf, mimeType);
      // Upload succeeds → only then stamp the new key into the update payload.
      const s3Key = this.buildS3Key(id);
      await this.s3.putHtml(s3Key, htmlBuf.toString("utf8"));
      updateData.s3Key = s3Key;
      updateData.sizeBytes = htmlBuf.length;
    }

    const updated = await this.reportsRepo.update(id, updateData);
    if (!updated) throw new NotFoundException("Báo cáo không tìm thấy");
    this.logger.log(`Report updated id=${id}`);
    return toDto(updated);
  }

  // ---------------------------------------------------------------------------
  // DELETE (soft)
  // ---------------------------------------------------------------------------

  async remove(id: string): Promise<void> {
    const deleted = await this.reportsRepo.softDelete(id);
    if (!deleted) throw new NotFoundException("Báo cáo không tìm thấy");
    this.logger.log(`Report soft-deleted id=${id}`);
  }

  // ---------------------------------------------------------------------------
  // BULK DELETE (soft) — super_admin only
  // ---------------------------------------------------------------------------

  async bulkRemove(ids: string[]): Promise<{ deleted: number }> {
    const deleted = await this.reportsRepo.softDeleteBulk(ids);
    this.logger.log(
      `Reports bulk soft-deleted count=${deleted} ids=[${ids.join(",")}]`,
    );
    return { deleted };
  }

  // ---------------------------------------------------------------------------
  // LIST — employees see only assigned + published + not-deleted reports
  //
  // Delegates to AssignmentsService.getAssignedReportIds() which already applies
  // the JOIN reports r ON r.deleted_at IS NULL AND r.status = 'published' filter.
  // The repository list() then applies its own deleted_at IS NULL guard + the
  // reportIds array filter, so the combined result is: assigned AND published
  // AND not-deleted — behaviour is identical to the original inline query.
  // ---------------------------------------------------------------------------

  async findAll(
    pagination: PaginationDto,
    role: "super_admin" | "employee",
    userId: string,
  ): Promise<{
    data: ReportDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    let reportIds: string[] | undefined;
    let publishedOnly = false;
    // assignedTo is only honoured for super_admin — employees have their own scope
    const assignedTo =
      role === "super_admin" ? pagination.assignedTo : undefined;

    if (role === "employee") {
      // AssignmentsService.getAssignedReportIds already filters published + not-deleted.
      reportIds = await this.assignmentsService.getAssignedReportIds(userId);
      publishedOnly = true; // belt-and-suspenders: also filter in list() query
    }

    const { rows, total } = await this.reportsRepo.list({
      search: pagination.search,
      page: pagination.page,
      limit: pagination.limit,
      reportIds,
      publishedOnly,
      createdFrom: pagination.createdFrom,
      createdTo: pagination.createdTo,
      assignedTo,
    });

    return {
      data: rows.map(toDto),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  // ---------------------------------------------------------------------------
  // FIND ONE — employees must be assigned AND report must be published
  // ---------------------------------------------------------------------------

  async findOne(
    id: string,
    role: "super_admin" | "employee",
    userId: string,
  ): Promise<ReportDto> {
    const report = await this.reportsRepo.findById(id);
    if (!report) throw new NotFoundException("Báo cáo không tìm thấy");

    if (role === "employee") {
      // Delegate assignment check to AssignmentsService (single source of truth).
      const assigned = await this.assignmentsService.isAssigned(id, userId);
      if (!assigned || report.status !== "published") {
        throw new ForbiddenException("Bạn không có quyền xem báo cáo này");
      }
    }

    return toDto(report);
  }

  // ---------------------------------------------------------------------------
  // CONTENT PROXY (iframe) — employees must be assigned AND report published
  // ---------------------------------------------------------------------------

  async getContent(
    id: string,
    role: "super_admin" | "employee",
    userId: string,
  ): Promise<{ html: Buffer; contentType: string }> {
    // Find report — include checking deleted_at
    const report = await this.reportsRepo.findByIdIncludeDeleted(id);
    if (!report || report.deleted_at !== null) {
      throw new NotFoundException("Báo cáo không tìm thấy");
    }

    if (role === "employee") {
      // Delegate assignment check to AssignmentsService.
      const assigned = await this.assignmentsService.isAssigned(id, userId);
      if (!assigned) {
        throw new ForbiddenException("Bạn không có quyền xem báo cáo này");
      }
      if (report.status !== "published") {
        throw new ForbiddenException("Báo cáo chưa được publish");
      }
    }

    if (!report.s3_key || report.s3_key === "pending") {
      throw new NotFoundException("Nội dung báo cáo chưa sẵn sàng");
    }

    const { body, contentType } = await this.s3.get(report.s3_key);
    return { html: body, contentType };
  }
}
