import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { OperatorsModule } from '../operators/operators.module';
import { ProcessingActivitiesModule } from '../processing-activities/processing-activities.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User]), OperatorsModule, ProcessingActivitiesModule],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
