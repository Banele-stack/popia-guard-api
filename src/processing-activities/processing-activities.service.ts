import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessingActivity } from './entities/processing-activity.entity';
import { CreateProcessingActivityDto } from './dto/create-processing-activity.dto';
import { UpdateProcessingActivityDto } from './dto/update-processing-activity.dto';

@Injectable()
export class ProcessingActivitiesService {
  constructor(
    @InjectRepository(ProcessingActivity)
    private readonly repo: Repository<ProcessingActivity>,
  ) {}

  findAll(organizationId: string): Promise<ProcessingActivity[]> {
    return this.repo.find({ where: { organizationId }, order: { activityName: 'ASC' } });
  }

  async findOne(id: string, organizationId: string): Promise<ProcessingActivity> {
    const activity = await this.repo.findOne({ where: { id, organizationId } });
    if (!activity) {
      throw new NotFoundException(`Processing activity ${id} not found`);
    }
    return activity;
  }

  create(dto: CreateProcessingActivityDto, organizationId: string): Promise<ProcessingActivity> {
    const activity = this.repo.create({ ...dto, organizationId });
    return this.repo.save(activity);
  }

  async update(id: string, dto: UpdateProcessingActivityDto, organizationId: string): Promise<ProcessingActivity> {
    const activity = await this.findOne(id, organizationId);
    Object.assign(activity, dto);
    return this.repo.save(activity);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const result = await this.repo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Processing activity ${id} not found`);
    }
  }
}
