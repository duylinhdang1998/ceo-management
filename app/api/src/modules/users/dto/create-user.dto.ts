import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'name không được để trống' })
  name: string;

  @IsEmail({}, { message: 'email không đúng định dạng' })
  @IsNotEmpty({ message: 'email không được để trống' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'password không được để trống' })
  @MinLength(8, { message: 'password phải có ít nhất 8 ký tự' })
  password: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0|\+84)(3[2-9]|5[25689]|7[06789]|8[0-9]|9[0-9])[0-9]{7}$/, {
    message: 'phone không đúng định dạng số điện thoại Việt Nam',
  })
  phone?: string;
}
