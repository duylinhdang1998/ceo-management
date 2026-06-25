import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Per-assignee entry: userId + optional permission flags.
 */
export class AssigneePermissionDto {
  @IsUUID("4", { message: "userId phải là UUID hợp lệ" })
  userId: string;

  @IsOptional()
  @IsBoolean()
  canEdit?: boolean;

  @IsOptional()
  @IsBoolean()
  canDownload?: boolean;
}

/**
 * ReplaceAssigneesDto — body for PUT /api/reports/:id/assignments.
 * Accepts an empty array to clear all assignments.
 */
export class ReplaceAssigneesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneePermissionDto)
  assignees: AssigneePermissionDto[];
}
