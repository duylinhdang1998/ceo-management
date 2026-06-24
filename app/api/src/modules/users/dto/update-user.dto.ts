import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from "class-validator";

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: "email không đúng định dạng" })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0|\+84)(3[2-9]|5[25689]|7[06789]|8[0-9]|9[0-9])[0-9]{7}$/, {
    message: "phone không đúng định dạng số điện thoại Việt Nam",
  })
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
