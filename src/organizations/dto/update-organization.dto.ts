import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  informationOfficerName?: string;

  @IsOptional()
  @IsEmail()
  informationOfficerEmail?: string;

  @IsOptional()
  @IsString()
  regulatorRegistrationRef?: string;

  @IsOptional()
  @IsDateString()
  regulatorRegistrationDate?: string;
}
