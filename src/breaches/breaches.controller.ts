import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BreachesService } from './breaches.service';
import { CreateBreachDto } from './dto/create-breach.dto';
import { UpdateBreachDto } from './dto/update-breach.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('breaches')
export class BreachesController {
  constructor(private readonly breachesService: BreachesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.breachesService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.breachesService.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateBreachDto, @CurrentUser() user: AuthenticatedUser) {
    return this.breachesService.create(dto, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBreachDto, @CurrentUser() user: AuthenticatedUser) {
    return this.breachesService.update(id, dto, user.organizationId);
  }
}
