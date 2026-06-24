// ── Shared Domain Types — CEO Management Portal ───────────────────────────

export type Role = 'super_admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

// Standard API response envelope: { success, data, meta? }
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Pagination;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
