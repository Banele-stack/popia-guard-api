import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const SEVERITIES = ['Low', 'Medium', 'High', 'Reportable'];

export class CreateBreachDto {
  @IsString()
  title: string;

  @IsIn(SEVERITIES)
  severity: string;

  @IsString()
  dateDiscovered: string;

  @IsOptional()
  @IsString()
  dateOccurred?: string;

  @IsString()
  description: string;

  @IsString()
  categoryOfDataAffected: string;

  @IsInt()
  @Min(0)
  numberOfDataSubjectsAffected: number;

  @IsOptional()
  @IsBoolean()
  regulatorNotified?: boolean;

  @IsOptional()
  @IsBoolean()
  dataSubjectsNotified?: boolean;
}
