import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { OperatorAgreement } from './operator-agreement.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * An "Operator" in POPIA's own terminology (s1) — a third party who
 * processes personal information on behalf of the organization (a payroll
 * provider, a cloud host, a debt collector, ...). POPIA (s21) requires a
 * written agreement with every operator establishing and maintaining
 * confidentiality/security measures — that agreement is tracked as this
 * operator's OperatorAgreement documents, same shape as CompliancePro's
 * contractor compliance documents.
 */
@Entity('operators')
export class Operator {
  @PrimaryColumn('varchar')
  id: string;

  @Index()
  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar')
  name: string;

  /** What the operator actually does — "Payroll processing", "Cloud hosting", etc. */
  @Column('varchar')
  serviceProvided: string;

  @Column('varchar')
  contactPerson: string;

  @Column('varchar')
  contactEmail: string;

  @Column('varchar')
  contactPhone: string;

  /** Plain description of what personal information is actually shared with them. */
  @Column('text')
  dataShared: string;

  @Column('varchar')
  onboardedDate: string;

  @OneToMany(() => OperatorAgreement, (doc) => doc.operator, { cascade: true, eager: true })
  agreements: OperatorAgreement[];
}
