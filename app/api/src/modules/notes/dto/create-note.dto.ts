import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty({ message: "content không được để trống" })
  content: string;

  @IsOptional()
  @IsUUID("all", { message: "parentId phải là UUID hợp lệ" })
  parentId?: string;
}
