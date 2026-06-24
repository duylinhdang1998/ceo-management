import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'name không được để trống' })
  name: string;

  @IsEmail({}, { message: 'email không đúng định dạng' })
  @IsNotEmpty({ message: 'email không được để trống' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu tạm không được để trống' })
  password: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0|\+84)(3[2-9]|5[25689]|7[06789]|8[0-9]|9[0-9])[0-9]{7}$/, {
    message: 'phone không đúng định dạng số điện thoại Việt Nam',
  })
  phone?: string;
}
