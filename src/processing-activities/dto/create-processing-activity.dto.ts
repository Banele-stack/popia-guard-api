import { IsBoolean, IsIn, IsString, MinLength } from 'class-validator';
import { DataSubjectCategory, LegalBasis } from '../entities/processing-activity.entity';

const CATEGORIES: DataSubjectCategory[] = [
  'Employees',
  'Customers',
  'Job Applicants',
  'Suppliers',
  'Website Visitors',
];

const LEGAL_BASES: LegalBasis[] = [
  'Consent',
  'Contract',
  'Legal Obligation',
  'Legitimate Interest',
  'Vital Interest',
  'Public Law Duty',
];

export class CreateProcessingActivityDto {
  @IsString()
  id: string;

  @IsString()
  @MinLength(2)
  activityName: string;

  @IsString()
  department: string;

  @IsIn(CATEGORIES)
  categoryOfDataSubjects: DataSubjectCategory;

  @IsString()
  personalInfoCollected: string;

  @IsBoolean()
  specialPersonalInfo: boolean;

  @IsString()
  purposeOfProcessing: string;

  @IsIn(LEGAL_BASES)
  legalBasis: LegalBasis;

  @IsString()
  retentionPeriod: string;

  @IsString()
  reviewDate: string;
}
