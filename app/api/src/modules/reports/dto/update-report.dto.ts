import { IsString, IsOptional, IsIn, MaxLength } from "class-validator";

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(["draft", "published"])
  status?: "draft" | "published";

  /**
   * htmlContent — used in JSON body flow (FR7.2).
   * When present, the service uploads a new HTML to S3 and updates s3_key.
   */
  @IsOptional()
  @IsString()
  htmlContent?: string;
}
