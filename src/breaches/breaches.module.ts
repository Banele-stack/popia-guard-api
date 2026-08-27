import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreachesController } from './breaches.controller';
import { BreachesService } from './breaches.service';
import { Breach } from './entities/breach.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Breach])],
  controllers: [BreachesController],
  providers: [BreachesService],
  exports: [BreachesService],
})
export class BreachesModule {}
