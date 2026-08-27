import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessingActivitiesController } from './processing-activities.controller';
import { ProcessingActivitiesService } from './processing-activities.service';
import { ProcessingActivity } from './entities/processing-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessingActivity])],
  controllers: [ProcessingActivitiesController],
  providers: [ProcessingActivitiesService],
  exports: [ProcessingActivitiesService],
})
export class ProcessingActivitiesModule {}
