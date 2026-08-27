import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Operator } from './operator.entity';

@Entity('operator_agreements')
export class OperatorAgreement {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  operatorId: string;

  @ManyToOne(() => Operator, (operator) => operator.agreements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operatorId' })
  operator: Operator;

  /** e.g. "Operator Agreement (s21)", "Non-Disclosure Agreement", "Data Processing Addendum". */
  @Column('varchar')
  type: string;

  @Column('varchar')
  signedDate: string;

  /** When this agreement next needs review/renewal. */
  @Column('varchar')
  reviewDate: string;

  @Column('varchar')
  referenceNumber: string;

  /** A storage-backend-agnostic key/relative-path (see storage/file-storage.ts). */
  @Column('varchar', { nullable: true })
  fileUrl: string | null;

  @Column('varchar', { nullable: true })
  fileOriginalName: string | null;

  @Column('varchar', { nullable: true })
  fileMimeType: string | null;

  @Column('int', { nullable: true })
  fileSizeBytes: number | null;
}
