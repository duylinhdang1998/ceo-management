import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * ResponseInterceptor — wraps all successful responses in:
 * { success: true, data: ..., meta?: ... }
 *
 * Controllers can return { data, meta } to include pagination metadata,
 * or just raw data (which becomes { success: true, data: rawData }).
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        // Allow controllers to return { data, meta } for pagination
        if (
          value !== null &&
          typeof value === "object" &&
          "__wrapped__" in value
        ) {
          const { data, meta } = value as {
            data: T;
            meta?: Record<string, unknown>;
            __wrapped__: true;
          };
          return { success: true as const, data, ...(meta ? { meta } : {}) };
        }
        return { success: true as const, data: value };
      }),
    );
  }
}

/** Helper for controllers returning paginated data */
export function paginated<T>(
  data: T,
  meta: Record<string, unknown>,
): { data: T; meta: Record<string, unknown>; __wrapped__: true } {
  return { data, meta, __wrapped__: true };
}
