import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreatePatDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên token là bắt buộc' })
  @MaxLength(100)
  name: string;
}
