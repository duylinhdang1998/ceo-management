import { Module } from "@nestjs/common";
import { SkillController } from "./skill.controller";
import { AuthModule } from "../auth/auth.module";
import { S3Module } from "../../infra/s3.module";

@Module({
  imports: [AuthModule, S3Module],
  controllers: [SkillController],
})
export class SkillModule {}
