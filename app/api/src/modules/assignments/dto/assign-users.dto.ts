import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AssignUsersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'userIds phải có ít nhất 1 phần tử' })
  @IsUUID('4', { each: true, message: 'Mỗi userId phải là UUID hợp lệ' })
  userIds: string[];
}
