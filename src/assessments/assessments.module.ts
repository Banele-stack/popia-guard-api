import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { Assessment } from './entities/assessment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment])],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
