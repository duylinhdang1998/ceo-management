import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsISO8601,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 15;

  @IsOptional()
  @IsString()
  search?: string;

  /** ISO-8601 date string — filter records created on or after this date (inclusive). */
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  /** ISO-8601 date string — filter records created on or before this date (inclusive). */
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  /**
   * UUID of an employee — when present (super_admin only), return only reports assigned to that user.
   * Used by the email "attach report" popup to enumerate a specific employee's reports.
   */
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
