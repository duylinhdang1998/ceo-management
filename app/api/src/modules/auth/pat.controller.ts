import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PatService } from "./pat.service";
import { CreatePatDto } from "./dto/create-pat.dto";
import { JwtGuard } from "../../common/auth/jwt.guard";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Roles } from "../../common/auth/roles.decorator";
import {
  CurrentUser,
  JwtPayload,
} from "../../common/auth/current-user.decorator";

/**
 * PAT endpoints — all restricted to super_admin.
 * Routes: GET/POST/DELETE /api/auth/tokens
 */
@Controller("api/auth/tokens")
@UseGuards(JwtGuard, RolesGuard)
@Roles("super_admin")
export class PatController {
  constructor(private readonly patService: PatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePatDto) {
    return this.patService.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.patService.list(user.sub);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  revoke(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.patService.revoke(user.sub, id);
  }
}
