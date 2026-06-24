import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersRepository, UserPublic } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;
const DEFAULT_EMPLOYEE_PASSWORD = 'Nhanvien@123';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserPublic> {
    const existing = await this.repo.findByEmailExcludeId(dto.email);
    if (existing) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Email đã tồn tại' });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.repo.insert({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
    });
  }

  async findAll(opts: {
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ rows: UserPublic[]; total: number }> {
    return this.repo.findAll(opts);
  }

  async findById(id: string): Promise<UserPublic> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân viên' });
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    // Check existence first
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân viên' });
    }

    // Email uniqueness check (exclude current user)
    if (dto.email) {
      const conflict = await this.repo.findByEmailExcludeId(dto.email, id);
      if (conflict) {
        throw new ConflictException({ code: 'CONFLICT', message: 'Email đã tồn tại' });
      }
    }

    const updated = await this.repo.update(id, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      isActive: dto.isActive,
    });

    // update() returns null only if deleted concurrently — treat as 404
    if (!updated) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân viên' });
    }

    return updated;
  }

  async resetPassword(id: string): Promise<{ message: string; tempPassword: string }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân viên' });
    }

    const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, BCRYPT_ROUNDS);
    await this.repo.resetPassword(id, passwordHash);

    return { message: 'Đã đặt lại mật khẩu về mặc định', tempPassword: DEFAULT_EMPLOYEE_PASSWORD };
  }

  async softDelete(id: string): Promise<{ message: string }> {
    const result = await this.repo.softDelete(id);
    if (!result.deleted) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy nhân viên' });
    }
    return { message: 'Đã xóa nhân viên' };
  }
}
