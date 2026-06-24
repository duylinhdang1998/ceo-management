import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

/**
 * BulkDeleteReportsDto — body for POST /api/reports/bulk-delete.
 * Validates that ids is a non-empty array of valid UUID v4 strings.
 * Empty array or non-UUID values → 400 via global ValidationPipe.
 */
export class BulkDeleteReportsDto {
  @IsArray({ message: 'ids phải là một mảng' })
  @ArrayNotEmpty({ message: 'ids không được để trống' })
  @IsUUID('4', { each: true, message: 'Mỗi id phải là UUID v4 hợp lệ' })
  ids: string[];
}
