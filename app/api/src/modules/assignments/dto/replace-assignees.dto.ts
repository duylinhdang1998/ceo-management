import { IsArray, IsUUID } from 'class-validator';

/**
 * ReplaceAssigneesDto — body for PUT /api/reports/:id/assignments.
 * Accepts an empty array to clear all assignments.
 */
export class ReplaceAssigneesDto {
  @IsArray()
  @IsUUID('4', { each: true, message: 'Mỗi userId phải là UUID hợp lệ' })
  userIds: string[];
}
