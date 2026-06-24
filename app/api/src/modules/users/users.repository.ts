import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../common/db/db.module';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: UserRow): UserPublic {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async findByEmailExcludeId(
    email: string,
    excludeId?: string,
  ): Promise<{ id: string } | null> {
    const sql = excludeId
      ? `SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL AND id != $2`
      : `SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL`;
    const params = excludeId ? [email, excludeId] : [email];
    const res = await this.pool.query<{ id: string }>(sql, params);
    return res.rows[0] ?? null;
  }

  async insert(data: {
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string;
  }): Promise<UserPublic> {
    const res = await this.pool.query<UserRow>(
      `INSERT INTO users (name, email, phone, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, 'employee', true)
       RETURNING id, name, email, phone, role, is_active, must_change_password, created_at, updated_at`,
      [data.name, data.email.toLowerCase(), data.phone, data.passwordHash],
    );
    return mapRow(res.rows[0]);
  }

  async findAll(opts: {
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ rows: UserPublic[]; total: number }> {
    const { search, page, limit } = opts;
    const offset = (page - 1) * limit;

    const baseWhere = `
      WHERE role = 'employee'
        AND deleted_at IS NULL
        ${search ? `AND (name ILIKE $1 OR email ILIKE $1)` : ''}
    `;
    const params: (string | number)[] = search ? [`%${search}%`] : [];

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users ${baseWhere}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const paginatedParams = search
      ? [`%${search}%`, limit, offset]
      : [limit, offset];
    const limitPlaceholder = search ? '$2' : '$1';
    const offsetPlaceholder = search ? '$3' : '$2';

    const rows = await this.pool.query<UserRow>(
      `SELECT id, name, email, phone, role, is_active, must_change_password, created_at, updated_at
       FROM users
       ${baseWhere}
       ORDER BY created_at DESC
       LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      paginatedParams,
    );

    return { rows: rows.rows.map(mapRow), total };
  }

  async findById(id: string): Promise<UserPublic | null> {
    const res = await this.pool.query<UserRow>(
      `SELECT id, name, email, phone, role, is_active, must_change_password, created_at, updated_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string | null;
      isActive?: boolean;
    },
  ): Promise<UserPublic | null> {
    const setClauses: string[] = [];
    const params: (string | boolean | null)[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.email !== undefined) {
      setClauses.push(`email = $${idx++}`);
      params.push(data.email.toLowerCase());
    }
    if (data.phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      params.push(data.phone);
    }
    if (data.isActive !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      params.push(data.isActive);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = now()`);
    params.push(id);

    const res = await this.pool.query<UserRow>(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id, name, email, phone, role, is_active, must_change_password, created_at, updated_at`,
      params,
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  }

  async resetPassword(
    id: string,
    passwordHash: string,
  ): Promise<{ updated: boolean }> {
    const res = await this.pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = true,
           updated_at = now()
       WHERE id = $2 AND deleted_at IS NULL`,
      [passwordHash, id],
    );
    return { updated: (res.rowCount ?? 0) > 0 };
  }

  async softDelete(id: string): Promise<{ deleted: boolean }> {
    const res = await this.pool.query(
      `UPDATE users
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return { deleted: (res.rowCount ?? 0) > 0 };
  }
}
