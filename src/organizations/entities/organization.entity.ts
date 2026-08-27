import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A paying tenant — a compliance/legal consultancy managing POPIA
 * compliance for multiple client businesses, or a single business managing
 * its own. Every Operator, ProcessingActivity, Assessment and Breach
 * belongs to exactly one Organization, and every request is scoped to the
 * authenticated user's organizationId so one tenant can never see another
 * tenant's data.
 */
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  name: string;

  /** POPIA requires every responsible party to appoint and register an
   * Information Officer with the Information Regulator — tracked here at
   * the org level since there's exactly one (plus optional deputies, not
   * modelled yet) per organization, not a whole list like operators/activities. */
  @Column('varchar', { nullable: true })
  informationOfficerName: string | null;

  @Column('varchar', { nullable: true })
  informationOfficerEmail: string | null;

  @Column('varchar', { nullable: true })
  regulatorRegistrationRef: string | null;

  @Column('date', { nullable: true })
  regulatorRegistrationDate: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
