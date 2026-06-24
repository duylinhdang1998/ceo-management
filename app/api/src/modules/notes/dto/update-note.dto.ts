import { IsNotEmpty, IsString } from "class-validator";

export class UpdateNoteDto {
  @IsString()
  @IsNotEmpty({ message: "content không được để trống" })
  content: string;
}
