import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'newPassword không được để trống' })
  @MinLength(8, { message: 'newPassword phải có ít nhất 8 ký tự' })
  newPassword: string;
}
