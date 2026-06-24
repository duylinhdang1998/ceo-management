import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { DB_POOL } from '../../common/db/db.module';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from '../../common/auth/current-user.decorator';

const BCRYPT_ROUNDS = 12;
// Generic message prevents user enumeration
const INVALID_CREDENTIALS_MSG = 'Email hoặc mật khẩu không đúng';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    mustChangePassword: boolean;
    role: string;
  }> {
    // Case-insensitive email lookup
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, role, is_active, must_change_password
       FROM users
       WHERE lower(email) = lower($1)
         AND deleted_at IS NULL`,
      [dto.email],
    );

    const user = result.rows[0];

    // Always run bcrypt.compare to resist timing attacks,
    // even when user is not found (compare against a pre-computed dummy hash)
    const DUMMY_HASH =
      '$2b$12$cb.I6xUF5Q7yahZSEbKlf.bADWrS1CAZS/lBd0068v6LR.80RvZIK';
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const passwordValid = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !passwordValid) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: INVALID_CREDENTIALS_MSG,
      });
    }

    if (!user.is_active) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Tài khoản đã bị vô hiệu hóa',
      });
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as JwtPayload['role'],
      mustChangePassword: user.must_change_password,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      mustChangePassword: user.must_change_password,
      role: user.role,
    };
  }

  // ─── Change Password ──────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // Fetch current password hash
    const result = await this.pool.query<{
      password_hash: string;
      must_change_password: boolean;
    }>(
      `SELECT password_hash, must_change_password FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: INVALID_CREDENTIALS_MSG,
      });
    }

    // Verify oldPassword against stored hash
    const oldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password_hash);
    if (!oldPasswordValid) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Mật khẩu cũ không đúng',
      });
    }

    // New password must not be the same as the old one
    if (dto.newPassword === dto.oldPassword) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Mật khẩu mới không được trùng mật khẩu cũ',
      });
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = false,
           updated_at = now()
       WHERE id = $2`,
      [newHash, userId],
    );

    return { message: 'Đổi mật khẩu thành công' };
  }
}
