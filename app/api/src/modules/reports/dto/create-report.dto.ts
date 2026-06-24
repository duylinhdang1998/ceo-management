import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * CreateReportDto — status is intentionally omitted.
 * All new reports default to 'published' regardless of client input.
 */
export class CreateReportDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /**
   * htmlContent — used in JSON body flow (FR7.2).
   * When present, the service treats this as the HTML payload (no multipart file).
   */
  @IsOptional()
  @IsString()
  htmlContent?: string;
}
