import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const STATUSES = ['Open', 'Contained', 'Investigating', 'Closed'];

export class UpdateBreachDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsBoolean()
  regulatorNotified?: boolean;

  @IsOptional()
  @IsString()
  regulatorNotifiedDate?: string;

  @IsOptional()
  @IsBoolean()
  dataSubjectsNotified?: boolean;

  @IsOptional()
  @IsString()
  dataSubjectsNotifiedDate?: string;
}
