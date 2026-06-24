import { Controller, Get } from '@nestjs/common';

/**
 * Public liveness endpoint used by the Docker healthcheck.
 * No auth — must be reachable for `docker compose` to mark the api healthy
 * (the web service depends_on api: service_healthy).
 */
@Controller('api/health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
