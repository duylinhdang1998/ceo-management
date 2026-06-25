import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { memoryStorage } from "multer";

import { JwtGuard } from "../../common/auth/jwt.guard";
import { RolesGuard } from "../../common/auth/roles.guard";
import { JwtOrPatWriteGuard } from "../../common/auth/jwt-or-pat-write.guard";
import { ReportUpdateGuard } from "../../common/auth/report-update.guard";
import { ReportContentGuard } from "../../common/auth/report-content.guard";
import { Roles } from "../../common/auth/roles.decorator";
import {
  CurrentUser,
  JwtPayload,
} from "../../common/auth/current-user.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { BulkDeleteReportsDto } from "./dto/bulk-delete.dto";

/**
 * ReportsController — implements all endpoints per architecture §8 and SRS FR2/FR7.
 *
 * Write endpoints (POST, PUT, DELETE) accept either:
 *   - JWT with role=super_admin  (JwtGuard + RolesGuard)
 *   - Valid PAT in Bearer header (PatGuard)
 *
 * PUT /api/reports/:id additionally allows employee JWT if they have can_edit
 * (ReportUpdateGuard admits all valid JWT roles; service enforces can_edit for employees).
 */

// ---------------------------------------------------------------------------
// Multer options — store in memory, no disk writes
// ---------------------------------------------------------------------------
const multerMemoryOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 72 * 1024 * 1024 }, // 72 MB hard limit (service checks 70 MB)
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller("api/reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // --------------------------------------------------------------------------
  // POST /api/reports — create (super_admin JWT or PAT)
  // --------------------------------------------------------------------------
  @Post()
  @UseGuards(JwtOrPatWriteGuard)
  @UseInterceptors(FileInterceptor("file", multerMemoryOptions))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateReportDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.create(dto, file, user.sub);
  }

  // --------------------------------------------------------------------------
  // PUT /api/reports/:id — update (super_admin JWT/PAT OR employee with can_edit)
  // --------------------------------------------------------------------------
  @Put(":id")
  @UseGuards(ReportUpdateGuard)
  @UseInterceptors(FileInterceptor("file", multerMemoryOptions))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.update(id, dto, file, user.role, user.sub);
  }

  // --------------------------------------------------------------------------
  // POST /api/reports/bulk-delete — bulk soft delete (super_admin JWT only)
  // NOTE: declared BEFORE :id routes so NestJS does not match "bulk-delete" as
  // a param value.
  // --------------------------------------------------------------------------
  @Post("bulk-delete")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("super_admin")
  @HttpCode(HttpStatus.OK)
  async bulkRemove(@Body() dto: BulkDeleteReportsDto) {
    return this.reportsService.bulkRemove(dto.ids);
  }

  // --------------------------------------------------------------------------
  // DELETE /api/reports/:id — soft delete (super_admin JWT only)
  // --------------------------------------------------------------------------
  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("super_admin")
  async remove(@Param("id") id: string) {
    await this.reportsService.remove(id);
    return { deleted: true };
  }

  // --------------------------------------------------------------------------
  // GET /api/reports — list (JWT, role-scoped in service)
  // --------------------------------------------------------------------------
  @Get()
  @UseGuards(JwtGuard)
  async findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.findAll(pagination, user.role, user.sub);
  }

  // --------------------------------------------------------------------------
  // GET /api/reports/:id/view-token — issue short-lived view token (JWT)
  // NOTE: declared BEFORE :id so NestJS routing matches ":id/view-token" correctly
  // --------------------------------------------------------------------------
  @Get(":id/view-token")
  @UseGuards(JwtGuard)
  async getViewToken(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getViewToken(id, user.role, user.sub);
  }

  // --------------------------------------------------------------------------
  // GET /api/reports/:id — detail (JWT, role-scoped in service)
  // NOTE: must be declared BEFORE :id/content so NestJS routing matches correctly
  // --------------------------------------------------------------------------
  @Get(":id")
  @UseGuards(JwtGuard)
  async findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.reportsService.findOne(id, user.role, user.sub);
  }

  // --------------------------------------------------------------------------
  // GET /api/reports/:id/content — HTML proxy (ReportContentGuard; authz in service)
  // --------------------------------------------------------------------------
  @Get(":id/content")
  @UseGuards(ReportContentGuard)
  async getContent(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { html, contentType } = await this.reportsService.getContent(
      id,
      user.role,
      user.sub,
    );

    res
      .status(200)
      .set(
        "Content-Type",
        contentType.startsWith("text/html")
          ? "text/html; charset=utf-8"
          : contentType,
      )
      .set("X-Content-Type-Options", "nosniff")
      .set("Cache-Control", "no-store")
      .set(
        "Content-Security-Policy",
        [
          "default-src 'self' data: blob:",
          "script-src 'unsafe-inline' 'unsafe-eval' https: data: blob:",
          "style-src 'unsafe-inline' https: data:",
          "img-src https: data: blob:",
          "font-src https: data:",
          "connect-src https:",
        ].join("; "),
      )
      .send(html);
  }
}
