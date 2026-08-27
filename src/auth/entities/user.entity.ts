import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export type UserRole = 'admin' | 'member';

/**
 * 'invited': created by an admin's team invite, has an unusable placeholder
 * password and can't log in until the invite link is used to set a real
 * one. 'active': can log in normally.
 */
export type UserStatus = 'active' | 'invited';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('varchar')
  email: string;

  /** bcrypt hash — never the plaintext password. */
  @Column('varchar')
  passwordHash: string;

  @Column('varchar')
  name: string;

  @Column('varchar', { default: 'member' })
  role: UserRole;

  @Column('uuid')
  organizationId: string;

  @Column('varchar', { default: 'active' })
  status: UserStatus;

  /**
   * Shared by two flows that both hand someone a one-time link and let them
   * (re)set their password: forgot-password, and accepting a team invite
   * (see OrganizationsService.inviteMember). Only a hash of the raw token is
   * ever stored. Both null when there's no reset/invite in progress.
   */
  @Column('varchar', { nullable: true })
  resetTokenHash: string | null;

  @Column('timestamptz', { nullable: true })
  resetTokenExpiresAt: Date | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
