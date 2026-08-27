import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export interface CorrectiveAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  done: boolean;
}

/**
 * A data breach / security compromise (POPIA s22). Where severity could
 * result in harm to a data subject, POPIA requires notifying both the
 * Information Regulator and the affected data subjects "as soon as
 * reasonably possible" — tracked here explicitly (regulatorNotified /
 * dataSubjectsNotified) rather than left implicit in a status field, since
 * missing that notification is itself the compliance failure, separate
 * from whether the breach itself has been contained.
 */
@Entity('breaches')
export class Breach {
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

  /** Low / Medium / High / Reportable — Reportable meaning real risk of harm to data subjects. */
  @Column('varchar')
  severity: string;

  @Column('varchar')
  status: string;

  @Column('varchar')
  dateDiscovered: string;

  @Column('varchar', { nullable: true })
  dateOccurred: string | null;

  @Column('text')
  description: string;

  @Column('text')
  categoryOfDataAffected: string;

  @Column('int')
  numberOfDataSubjectsAffected: number;

  @Column('text', { nullable: true })
  rootCause: string | null;

  @Column('jsonb', { default: [] })
  correctiveActions: CorrectiveAction[];

  @Column('boolean', { default: false })
  regulatorNotified: boolean;

  @Column('varchar', { nullable: true })
  regulatorNotifiedDate: string | null;

  @Column('boolean', { default: false })
  dataSubjectsNotified: boolean;

  @Column('varchar', { nullable: true })
  dataSubjectsNotifiedDate: string | null;
}
