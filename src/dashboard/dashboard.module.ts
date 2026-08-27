import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OperatorsModule } from '../operators/operators.module';
import { ProcessingActivitiesModule } from '../processing-activities/processing-activities.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { BreachesModule } from '../breaches/breaches.module';

@Module({
  imports: [OperatorsModule, ProcessingActivitiesModule, AssessmentsModule, BreachesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
