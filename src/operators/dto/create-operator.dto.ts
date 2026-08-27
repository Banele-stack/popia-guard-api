import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  id: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  serviceProvided: string;

  @IsString()
  contactPerson: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  contactPhone: string;

  @IsString()
  dataShared: string;

  @IsString()
  onboardedDate: string;
}
