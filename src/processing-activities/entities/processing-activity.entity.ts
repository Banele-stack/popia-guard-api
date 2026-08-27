import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

/** POPIA s11's actual justification grounds for processing personal information. */
export type LegalBasis =
  | 'Consent'
  | 'Contract'
  | 'Legal Obligation'
  | 'Legitimate Interest'
  | 'Vital Interest'
  | 'Public Law Duty';

export type DataSubjectCategory = 'Employees' | 'Customers' | 'Job Applicants' | 'Suppliers' | 'Website Visitors';

/**
 * One entry in the organization's Record of Processing Activities (ROPA) —
 * the central artefact POPIA compliance actually revolves around: what
 * personal information you process, why, on what legal basis, and for how
 * long. The Information Regulator can request this record at any time.
 */
@Entity('processing_activities')
export class ProcessingActivity {
  @PrimaryColumn('varchar')
  id: string;

  @Index()
  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  /** e.g. "Employee payroll processing", "Customer order history". */
  @Column('varchar')
  activityName: string;

  @Column('varchar')
  department: string;

  @Column('varchar')
  categoryOfDataSubjects: DataSubjectCategory;

  /** Plain description of what personal information is actually collected. */
  @Column('text')
  personalInfoCollected: string;

  /** POPIA s26 gives "special personal information" (health, biometric,
   * religious/political belief, criminal record, etc.) extra protection —
   * flagged separately since it changes what safeguards are required. */
  @Column('boolean', { default: false })
  specialPersonalInfo: boolean;

  @Column('text')
  purposeOfProcessing: string;

  @Column('varchar')
  legalBasis: LegalBasis;

  /** e.g. "5 years after employment ends". */
  @Column('varchar')
  retentionPeriod: string;

  /** When this ROPA entry next needs review. */
  @Column('varchar')
  reviewDate: string;
}
