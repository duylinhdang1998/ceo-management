import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PatController } from "./pat.controller";
import { PatService } from "./pat.service";
import { JwtGuard } from "../../common/auth/jwt.guard";
import { RolesGuard } from "../../common/auth/roles.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? "dev_secret_change_me",
        signOptions: {
          expiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
        },
      }),
    }),
  ],
  controllers: [AuthController, PatController],
  providers: [AuthService, PatService, JwtGuard, RolesGuard],
  exports: [JwtModule, JwtGuard, RolesGuard],
})
export class AuthModule {}
