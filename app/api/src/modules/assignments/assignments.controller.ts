import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignUsersDto } from './dto/assign-users.dto';
import { JwtGuard } from '../../common/auth/jwt.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/auth/current-user.decorator';

@Controller('api/reports/:reportId/assignments')
@UseGuards(JwtGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * POST /api/reports/:reportId/assignments
   * Assign one or more employees to a report — super_admin only.
   */
  @Post()
  @Roles('super_admin')
  @HttpCode(HttpStatus.CREATED)
  async assign(
    @Param('reportId') reportId: string,
    @Body() dto: AssignUsersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentsService.assign(reportId, dto, user.sub);
  }

  /**
   * DELETE /api/reports/:reportId/assignments
   * Unassign one or more employees from a report — super_admin only.
   */
  @Delete()
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async unassign(
    @Param('reportId') reportId: string,
    @Body() dto: AssignUsersDto,
  ) {
    return this.assignmentsService.unassign(reportId, dto);
  }

  /**
   * GET /api/reports/:reportId/assignments
   * List all assignees for a report — super_admin only.
   */
  @Get()
  @Roles('super_admin')
  async listAssignees(@Param('reportId') reportId: string) {
    return this.assignmentsService.listAssignees(reportId);
  }
}
