import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'Pass' | 'Fail' | 'N/A';
  note?: string;
}

export interface Finding {
  id: string;
  checklistItemLabel: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  raisedBy: string;
  raisedDate: string;
}

/**
 * An internal POPIA self-assessment (audit) against a checklist — e.g. "do
 * we have a signed operator agreement for every third party?", "is there a
 * documented data retention policy?". A failed checklist item automatically
 * raises an open Finding, the same way a failed pre-shift check raises a
 * Defect in CompliancePro.
 */
@Entity('assessments')
export class Assessment {
  @PrimaryColumn('varchar')
  id: string;

  @Index()
  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar')
  title: string;

  @Column('varchar')
  assessorName: string;

  @Column('varchar')
  date: string;

  /** e.g. "HR", "IT Security", "Marketing" — which part of the business this covers. */
  @Column('varchar')
  area: string;

  @Column('varchar')
  result: string;

  @Column('text')
  notes: string;

  @Column('jsonb', { default: [] })
  checklist: ChecklistItem[];

  @Column('jsonb', { default: [] })
  findings: Finding[];
}
