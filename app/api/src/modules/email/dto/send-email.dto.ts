import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for POST /api/email/send (multipart/form-data)
 *
 * Files (attachments) are handled by the controller via @UploadedFiles().
 * Text fields come through as strings from multipart; class-transformer
 * coerces them appropriately.
 */
export class SendEmailDto {
  @IsUUID('all', { message: 'recipientUserId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'recipientUserId không được để trống' })
  recipientUserId: string;

  @IsString()
  @IsNotEmpty({ message: 'subject không được để trống' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'body không được để trống' })
  body: string;

  @IsOptional()
  @IsUUID('all', { message: 'reportId phải là UUID hợp lệ' })
  reportId?: string;
}
