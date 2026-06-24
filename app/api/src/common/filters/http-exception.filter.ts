import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

interface ErrorBody {
  code: string;
  message: string;
}

/**
 * HttpExceptionFilter — converts all HttpExceptions to the canonical error envelope:
 * { success: false, error: { code, message } }
 *
 * NestJS throws HttpExceptions with either:
 *   - a string message
 *   - an object { message, code?, error? }
 * We normalise all into { code, message }.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let error: ErrorBody;

    if (typeof exceptionResponse === "string") {
      error = {
        code: this.statusToCode(status),
        message: exceptionResponse,
      };
    } else if (typeof exceptionResponse === "object") {
      const resp = exceptionResponse as Record<string, any>;
      // class-validator validation errors arrive as arrays in resp.message
      const message = Array.isArray(resp.message)
        ? resp.message.join("; ")
        : (resp.message ?? exception.message);
      error = {
        code: resp.code ?? this.statusToCode(status),
        message,
      };
    } else {
      error = {
        code: this.statusToCode(status),
        message: exception.message,
      };
    }

    response.status(status).json({
      success: false,
      error,
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
      [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
      [HttpStatus.FORBIDDEN]: "FORBIDDEN",
      [HttpStatus.NOT_FOUND]: "NOT_FOUND",
      [HttpStatus.CONFLICT]: "CONFLICT",
      [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
      [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
    };
    return map[status] ?? "ERROR";
  }
}
