import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';

/**
 * Unauthenticated liveness/readiness probe for whatever hosts this. Actually
 * queries Postgres rather than just returning 200 unconditionally — a
 * backend that's up but can't reach its database is not actually healthy.
 */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (err) {
      throw new HttpException(
        {
          status: 'error',
          database: 'unreachable',
          message: err instanceof Error ? err.message : 'Unknown database error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
