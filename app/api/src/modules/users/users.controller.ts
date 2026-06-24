import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtGuard } from "../../common/auth/jwt.guard";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { paginated } from "../../common/response.interceptor";

@Controller("api/users")
@UseGuards(JwtGuard, RolesGuard)
@Roles("super_admin")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { rows, total } = await this.usersService.findAll({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return paginated(rows, {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    });
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Param("id") id: string) {
    return this.usersService.resetPassword(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async softDelete(@Param("id") id: string) {
    return this.usersService.softDelete(id);
  }
}
