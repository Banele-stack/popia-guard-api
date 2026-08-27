import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Registered globally (see main.ts). Logs one line per request — method,
 * path, status, duration, and the authenticated user's org if there is one.
 * Deliberately not logging request bodies: a login body has a password in it.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { organizationId?: string } }>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(method, originalUrl, res.statusCode, start, req.user?.organizationId),
        error: (err: { status?: number }) =>
          this.log(method, originalUrl, err?.status ?? 500, start, req.user?.organizationId),
      }),
    );
  }

  private log(method: string, url: string, status: number, start: number, orgId?: string) {
    const ms = Date.now() - start;
    const org = orgId ? ` org=${orgId}` : '';
    this.logger.log(`${method} ${url} ${status} ${ms}ms${org}`);
  }
}
