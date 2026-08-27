import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User])],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [TypeOrmModule],
})
export class OrganizationsModule {}
