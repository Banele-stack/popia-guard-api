import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessingActivityDto } from './create-processing-activity.dto';

export class UpdateProcessingActivityDto extends PartialType(CreateProcessingActivityDto) {}
