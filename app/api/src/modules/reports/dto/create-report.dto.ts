import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  /**
   * htmlContent — used in JSON body flow (FR7.2).
   * When present, the service treats this as the HTML payload (no multipart file).
   */
  @IsOptional()
  @IsString()
  htmlContent?: string;
}
