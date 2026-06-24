import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { DbModule } from "./common/db/db.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AssignmentsModule } from "./modules/assignments/assignments.module";
import { NotesModule } from "./modules/notes/notes.module";
import { EmailModule } from "./modules/email/email.module";
import { HealthModule } from "./modules/health/health.module";
import { ResponseInterceptor } from "./common/response.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

/**
 * In test env (NODE_ENV=test) all throttle limits are raised to 100 000
 * so integration test suites are never blocked. In production the limits
 * are:
 *   default  — 100 req / 60 s  (all routes)
 *   email    —   5 req / 60 s  (compose + send, applied via @Throttle)
 */
const isTest = process.env.NODE_ENV === "test";

@Module({
  imports: [
    // IMPORTANT: only ONE named throttler ('default') is registered globally.
    // With multiple named throttlers, NestJS applies EVERY one to EVERY route
    // (a previous 'email' bucket of 5/min silently capped ALL endpoints → 429).
    // Sensitive routes tighten the default bucket per-handler via @Throttle({ default: {...} }):
    //   login → 20/min (brute-force guard), AI email compose/send → 5/min. Health is @SkipThrottle.
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: isTest ? 100_000 : 1000,
      },
    ]),
    DbModule,
    AuthModule,
    UsersModule,
    ReportsModule,
    AssignmentsModule,
    NotesModule,
    EmailModule,
    HealthModule,
  ],
  providers: [
    // Global throttler guard — enforces ThrottlerModule limits on all routes.
    // Per-route @Throttle() decorators select which named bucket(s) to apply.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
