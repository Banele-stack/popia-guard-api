import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsIn(['Pass', 'Fail', 'N/A'])
  status: 'Pass' | 'Fail' | 'N/A';

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateAssessmentDto {
  @IsString()
  title: string;

  @IsString()
  assessorName: string;

  @IsString()
  date: string;

  @IsString()
  area: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  checklist: CreateChecklistItemDto[];
}
