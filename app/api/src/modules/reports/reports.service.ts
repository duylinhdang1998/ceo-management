import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { S3Service } from "../../infra/s3.service";
import { AssignmentsService } from "../assignments/assignments.service";
import { ReportsRepository, ReportRow } from "./reports.repository";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { paginated } from "../../common/response.interceptor";
import * as crypto from "crypto";

type PaginatedResult<T> = {
  data: T;
  meta: Record<string, unknown>;
  __wrapped__: true;
};

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
  /** Whether the current viewer may edit this report. */
  canEdit: boolean;
  /** Whether the current viewer may download this report. */
  canDownload: boolean;
}

function toDto(
  row: ReportRow,
  flags: { canEdit: boolean; canDownload: boolean },
): ReportDto {
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
    canEdit: flags.canEdit,
    canDownload: flags.canDownload,
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportsRepo: ReportsRepository,
    private readonly s3: S3Service,
    private readonly assignmentsService: AssignmentsService,
    private readonly jwtService: JwtService,
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
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateReportDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<ReportDto> {
    let htmlBuf: Buffer;
    let mimeType: string;

    if (file) {
      htmlBuf = file.buffer;
      mimeType = file.mimetype;
    } else if (dto.htmlContent) {
      htmlBuf = Buffer.from(dto.htmlContent, "utf8");
      mimeType = "text/html";
    } else {
      throw new BadRequestException("Phải cung cấp file HTML hoặc htmlContent");
    }

    this.validateHtmlBuffer(htmlBuf, mimeType);

    const reportId = crypto.randomUUID();
    const s3Key = this.buildS3Key(reportId);

    await this.s3.putHtml(s3Key, htmlBuf.toString("utf8"));

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
    // Creator is super_admin — both flags true
    return toDto(report, { canEdit: true, canDownload: true });
  }

  // ---------------------------------------------------------------------------
  // UPDATE — allow super_admin or employee with can_edit
  // ---------------------------------------------------------------------------

  async update(
    id: string,
    dto: UpdateReportDto,
    file: Express.Multer.File | undefined,
    role: "super_admin" | "employee",
    userId: string,
  ): Promise<ReportDto> {
    const existing = await this.reportsRepo.findById(id);
    if (!existing) throw new NotFoundException("Báo cáo không tìm thấy");

    // Employee authz: must have can_edit
    if (role !== "super_admin") {
      const perms = await this.assignmentsService.getPermissions(id, userId);
      if (!perms || !perms.canEdit) {
        throw new ForbiddenException("Bạn không có quyền sửa báo cáo này");
      }
    }

    const updateData: Parameters<ReportsRepository["update"]>[1] = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;

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
      const s3Key = this.buildS3Key(id);
      await this.s3.putHtml(s3Key, htmlBuf.toString("utf8"));
      updateData.s3Key = s3Key;
      updateData.sizeBytes = htmlBuf.length;
    }

    const updated = await this.reportsRepo.update(id, updateData);
    if (!updated) throw new NotFoundException("Báo cáo không tìm thấy");
    this.logger.log(`Report updated id=${id}`);
    // Determine flags for the response
    const flags =
      role === "super_admin"
        ? { canEdit: true, canDownload: true }
        : ((await this.assignmentsService.getPermissions(id, userId)) ?? {
            canEdit: false,
            canDownload: false,
          });
    return toDto(updated, flags);
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
  // ---------------------------------------------------------------------------

  async findAll(
    pagination: PaginationDto,
    role: "super_admin" | "employee",
    userId: string,
  ): Promise<PaginatedResult<ReportDto[]>> {
    let reportIds: string[] | undefined;
    let publishedOnly = false;
    const assignedTo =
      role === "super_admin" ? pagination.assignedTo : undefined;

    if (role === "employee") {
      reportIds = await this.assignmentsService.getAssignedReportIds(userId);
      publishedOnly = true;
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

    let dtos: ReportDto[];

    if (role === "super_admin") {
      dtos = rows.map((r) => toDto(r, { canEdit: true, canDownload: true }));
    } else {
      // Batch fetch permission flags for all listed reports
      const ids = rows.map((r) => r.id);
      const permMap = await this.assignmentsService.getPermissionsBatch(
        userId,
        ids,
      );
      dtos = rows.map((r) => {
        const perms = permMap.get(r.id) ?? {
          canEdit: false,
          canDownload: false,
        };
        return toDto(r, perms);
      });
    }

    return paginated(dtos, {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    });
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
      const assigned = await this.assignmentsService.isAssigned(id, userId);
      if (!assigned || report.status !== "published") {
        throw new ForbiddenException("Bạn không có quyền xem báo cáo này");
      }
      const perms = await this.assignmentsService.getPermissions(id, userId);
      return toDto(report, perms ?? { canEdit: false, canDownload: false });
    }

    // super_admin
    return toDto(report, { canEdit: true, canDownload: true });
  }

  // ---------------------------------------------------------------------------
  // VIEW-TOKEN — short-lived JWT scoped to one report
  // ---------------------------------------------------------------------------

  async getViewToken(
    id: string,
    role: "super_admin" | "employee",
    userId: string,
  ): Promise<{ token: string }> {
    const report = await this.reportsRepo.findById(id);
    if (!report) throw new NotFoundException("Báo cáo không tìm thấy");

    if (role === "employee") {
      const assigned = await this.assignmentsService.isAssigned(id, userId);
      if (!assigned || report.status !== "published") {
        throw new ForbiddenException("Bạn không có quyền xem báo cáo này");
      }
    }

    const token = await this.jwtService.signAsync(
      { sub: userId, role, reportId: id, purpose: "report-view" },
      { secret: process.env.JWT_SECRET, expiresIn: "5m" },
    );

    return { token };
  }

  // ---------------------------------------------------------------------------
  // CONTENT PROXY (iframe) — employees must be assigned AND report published
  // ---------------------------------------------------------------------------

  async getContent(
    id: string,
    role: "super_admin" | "employee",
    userId: string,
  ): Promise<{ html: Buffer; contentType: string }> {
    const report = await this.reportsRepo.findByIdIncludeDeleted(id);
    if (!report || report.deleted_at !== null) {
      throw new NotFoundException("Báo cáo không tìm thấy");
    }

    if (role === "employee") {
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
