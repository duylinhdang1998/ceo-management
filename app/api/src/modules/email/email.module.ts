import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { AiService } from "./ai.service";
import { EmailController } from "./email.controller";
import { EmailRepository } from "./email.repository";
import { UsersModule } from "../users/users.module";
import { AuthModule } from "../auth/auth.module";

/**
 * EmailModule — AI compose + Gmail SMTP send + email_logs.
 *
 * Imports:
 *   - AuthModule  → provides JwtGuard, RolesGuard, JwtModule (for guard DI)
 *   - UsersModule → exports UsersRepository for recipient validation + employee list
 *
 * DbModule is global (registered in AppModule) — no explicit import needed
 * for EmailRepository which injects DB_POOL directly.
 *
 * Note: app.module.ts registers EmailModule (done by BE#1).
 * This module owns all internals of modules/email/.
 */
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [EmailController],
  providers: [EmailService, AiService, EmailRepository],
  exports: [EmailService, AiService],
})
export class EmailModule {}
