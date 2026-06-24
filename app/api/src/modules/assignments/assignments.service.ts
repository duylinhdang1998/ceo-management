import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentsRepository, AssigneePublic } from './assignments.repository';
import { AssignUsersDto } from './dto/assign-users.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly repo: AssignmentsRepository) {}

  async assign(
    reportId: string,
    dto: AssignUsersDto,
    assignedBy: string,
  ): Promise<{ message: string; count: number }> {
    // Verify report exists
    const reportExists = await this.repo.reportExists(reportId);
    if (!reportExists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Báo cáo không tồn tại' });
    }

    // Verify all userIds exist
    const existingCount = await this.repo.countExistingUsers(dto.userIds);
    if (existingCount !== dto.userIds.length) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Một hoặc nhiều nhân viên không tồn tại' });
    }

    await this.repo.assign(reportId, dto.userIds, assignedBy);

    return { message: 'Gán báo cáo thành công', count: dto.userIds.length };
  }

  async unassign(
    reportId: string,
    dto: AssignUsersDto,
  ): Promise<{ message: string }> {
    // Verify report exists
    const reportExists = await this.repo.reportExists(reportId);
    if (!reportExists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Báo cáo không tồn tại' });
    }

    // Idempotent — unassign even if not assigned; no error
    await this.repo.unassign(reportId, dto.userIds);

    return { message: 'Bỏ gán thành công' };
  }

  async listAssignees(reportId: string): Promise<AssigneePublic[]> {
    const reportExists = await this.repo.reportExists(reportId);
    if (!reportExists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Báo cáo không tồn tại' });
    }
    return this.repo.listAssignees(reportId);
  }

  // ─── Methods exposed for BE#2 (ReportsModule) ─────────────────────────────

  /**
   * Check whether userId is assigned to reportId.
   * Used by reports content endpoint to gate employee access.
   */
  async isAssigned(reportId: string, userId: string): Promise<boolean> {
    return this.repo.isAssigned(reportId, userId);
  }

  /**
   * Return all published, non-deleted report IDs assigned to userId.
   * Used by reports list endpoint for employee-scoped filtering.
   */
  async getAssignedReportIds(userId: string): Promise<string[]> {
    return this.repo.getAssignedReportIds(userId);
  }
}
