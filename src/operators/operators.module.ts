import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { Operator } from './entities/operator.entity';
import { OperatorAgreement } from './entities/operator-agreement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Operator, OperatorAgreement])],
  controllers: [OperatorsController],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
