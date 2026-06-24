import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportsRepository } from "./reports.repository";
import { JwtOrPatWriteGuard } from "../../common/auth/jwt-or-pat-write.guard";
import { S3Module } from "../../infra/s3.module";
import { AuthModule } from "../auth/auth.module";
import { AssignmentsModule } from "../assignments/assignments.module";

/**
 * ReportsModule — owns CRUD + S3 upload + HTML content proxy.
 *
 * Imports:
 *   - S3Module           — provides S3Service for HTML upload/download
 *   - AuthModule         — provides JwtModule (JwtService for JwtOrPatWriteGuard),
 *                          JwtGuard, RolesGuard
 *   - AssignmentsModule  — exports AssignmentsService; provides isAssigned() and
 *                          getAssignedReportIds() for employee access control
 *   - DbModule is global (provided by AppModule) — no explicit import needed
 *
 * JwtOrPatWriteGuard is imported from common/auth (per Blueprint) and registered
 * here as a provider so DI can inject DB_POOL and JwtService into it.
 */
@Module({
  imports: [S3Module, AuthModule, AssignmentsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository, JwtOrPatWriteGuard],
})
export class ReportsModule {}
