import { IsString, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

/**
 * DTO for POST /api/email/compose
 *
 * - prompt: free-text CEO input, e.g. "gửi cho Lan link báo cáo doanh thu quý 2"
 * - reportId: optional — if supplied, the response will include a reportLink
 * - selectedRecipientId: optional — CEO's explicit choice after
 *   requiresRecipientSelection was returned in a prior compose call
 */
export class ComposeEmailDto {
  @IsString()
  @IsNotEmpty({ message: "Prompt không được để trống" })
  prompt: string;

  @IsOptional()
  @IsUUID("all", { message: "reportId phải là UUID hợp lệ" })
  reportId?: string;

  @IsOptional()
  @IsUUID("all", { message: "selectedRecipientId phải là UUID hợp lệ" })
  selectedRecipientId?: string;
}
