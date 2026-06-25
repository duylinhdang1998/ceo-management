import {
  Controller,
  Get,
  Res,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "../../common/auth/jwt.guard";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { S3Service } from "../../infra/s3.service";

/** S3 object key for the downloadable skill package. */
export const SKILL_S3_KEY = "skills/ceo-report-upload.zip";

/**
 * SkillController — lets the CEO download the "ceo-report-upload" Claude Code
 * skill from the portal (Tokens page) instead of being sent zip files manually.
 *
 * The zip lives in S3 (NOT in the source tree / image). Publish or update it with
 * `npm run publish:skill`, which rebuilds the zip from .claude/skills/ceo-report-upload
 * and replaces the S3 object — the portal then serves the new version with no redeploy.
 */
@Controller("api/skill")
@UseGuards(JwtGuard, RolesGuard)
export class SkillController {
  constructor(private readonly s3: S3Service) {}

  /**
   * GET /api/skill/ceo-report-upload — stream the skill zip from S3. super_admin only.
   */
  @Get("ceo-report-upload")
  @Roles("super_admin")
  async download(@Res() res: Response): Promise<void> {
    let body: Buffer;
    try {
      ({ body } = await this.s3.get(SKILL_S3_KEY));
    } catch {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message:
          "Gói skill chưa được đăng tải lên máy chủ. Hãy chạy `npm run publish:skill`.",
      });
    }

    res
      .status(200)
      .set("Content-Type", "application/zip")
      .set(
        "Content-Disposition",
        'attachment; filename="ceo-report-upload-skill.zip"',
      )
      .set("Cache-Control", "no-store")
      .send(body);
  }
}
