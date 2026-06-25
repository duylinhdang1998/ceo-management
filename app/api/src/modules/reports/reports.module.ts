import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportsRepository } from "./reports.repository";
import { JwtOrPatWriteGuard } from "../../common/auth/jwt-or-pat-write.guard";
import { ReportUpdateGuard } from "../../common/auth/report-update.guard";
import { ReportContentGuard } from "../../common/auth/report-content.guard";
import { S3Module } from "../../infra/s3.module";
import { AuthModule } from "../auth/auth.module";
import { AssignmentsModule } from "../assignments/assignments.module";

/**
 * ReportsModule — owns CRUD + S3 upload + HTML content proxy.
 *
 * Imports:
 *   - S3Module           — provides S3Service for HTML upload/download
 *   - AuthModule         — provides JwtModule (JwtService for guards),
 *                          JwtGuard, RolesGuard
 *   - AssignmentsModule  — exports AssignmentsService; provides isAssigned(),
 *                          getAssignedReportIds(), getPermissions(), getPermissionsBatch()
 *   - DbModule is global (provided by AppModule) — no explicit import needed
 *
 * Guards:
 *   - JwtOrPatWriteGuard  — POST (create); PAT or super_admin JWT
 *   - ReportUpdateGuard   — PUT (update); PAT or any authenticated JWT
 *   - ReportContentGuard  — GET content; Authorization JWT or ?token view-token
 */
@Module({
  imports: [S3Module, AuthModule, AssignmentsModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRepository,
    JwtOrPatWriteGuard,
    ReportUpdateGuard,
    ReportContentGuard,
  ],
})
export class ReportsModule {}
