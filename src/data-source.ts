import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Organization } from './organizations/entities/organization.entity';
import { User } from './auth/entities/user.entity';
import { Operator } from './operators/entities/operator.entity';
import { OperatorAgreement } from './operators/entities/operator-agreement.entity';
import { ProcessingActivity } from './processing-activities/entities/processing-activity.entity';
import { Assessment } from './assessments/entities/assessment.entity';
import { Breach } from './breaches/entities/breach.entity';

/**
 * Used only by the TypeORM CLI (npm run migration:generate / migration:run),
 * not by the running app (see app.module.ts for the NestJS-managed
 * connection). Keep the entity list here in sync with app.module.ts's
 * autoLoadEntities set.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    Organization,
    User,
    Operator,
    OperatorAgreement,
    ProcessingActivity,
    Assessment,
    Breach,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
