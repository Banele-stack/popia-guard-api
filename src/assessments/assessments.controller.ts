import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.create(dto, user.organizationId);
  }
}
