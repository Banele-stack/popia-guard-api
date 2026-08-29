import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { OperatorsModule } from './operators/operators.module';
import { ProcessingActivitiesModule } from './processing-activities/processing-activities.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { BreachesModule } from './breaches/breaches.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthModule } from './health/health.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from './storage/storage.module';
import { AlertsModule } from './alerts/alerts.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // Hosted Postgres providers that require an encrypted connection
      // (Neon, Render's own Postgres, etc.) reject a plain connection
      // outright — but a local dev Postgres on localhost typically has no
      // SSL listener at all, so this can't just be on unconditionally.
      // rejectUnauthorized: false accepts the provider's own cert without
      // pinning a CA bundle, which is fine for this stage but worth
      // tightening (a real CA bundle) before this ever holds production
      // tenant data.
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      autoLoadEntities: true,
      // Schema is managed by migrations (see src/migrations, npm run
      // migration:run) — synchronize is only ever safe for the first-boot
      // demo database, never once real tenant data exists.
      synchronize: false,
      migrations: [join(__dirname, 'migrations', '*.js')],
      migrationsRun: true,
    }),

    // Global default: 60 requests/minute per IP. Auth endpoints override this
    // with a much tighter limit (see auth.controller.ts).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    // Powers AlertsModule's daily compliance-digest cron (see alerts.service.ts).
    ScheduleModule.forRoot(),

    StorageModule,
    EmailModule,
    HealthModule,
    OrganizationsModule,
    AuthModule,
    OperatorsModule,
    ProcessingActivitiesModule,
    AssessmentsModule,
    BreachesModule,
    DashboardModule,
    AlertsModule,
  ],
  providers: [
    // Order matters: rate-limit first, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
