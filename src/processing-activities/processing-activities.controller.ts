import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProcessingActivitiesService } from './processing-activities.service';
import { CreateProcessingActivityDto } from './dto/create-processing-activity.dto';
import { UpdateProcessingActivityDto } from './dto/update-processing-activity.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';

@Controller('processing-activities')
export class ProcessingActivitiesController {
  constructor(private readonly service: ProcessingActivitiesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateProcessingActivityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessingActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.organizationId);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.organizationId);
  }
}
