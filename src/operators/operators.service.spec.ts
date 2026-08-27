import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { OperatorsService } from './operators.service';
import { Operator } from './entities/operator.entity';
import { OperatorAgreement } from './entities/operator-agreement.entity';
import { FileStorage } from '../storage/file-storage';

// In-memory fake standing in for the TypeORM Repository — real enough to
// exercise the org-scoped where-clauses OperatorsService builds, without
// needing a live Postgres connection for what's fundamentally a logic test.
class FakeOperatorRepo {
  rows: Operator[] = [];

  find({ where }: { where: { organizationId: string } }) {
    return Promise.resolve(this.rows.filter((r) => r.organizationId === where.organizationId));
  }

  findOne({ where }: { where: { id: string; organizationId: string } }) {
    const row = this.rows.find((r) => r.id === where.id && r.organizationId === where.organizationId);
    return Promise.resolve(row ?? null);
  }

  create(partial: Partial<Operator>) {
    return partial as Operator;
  }

  save(entity: Operator) {
    this.rows.push(entity);
    return Promise.resolve(entity);
  }

  delete({ id, organizationId }: { id: string; organizationId: string }) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !(r.id === id && r.organizationId === organizationId));
    return Promise.resolve({ affected: before - this.rows.length });
  }
}

describe('OperatorsService — tenant isolation', () => {
  let service: OperatorsService;
  let repo: FakeOperatorRepo;

  const ORG_A = 'org-a';
  const ORG_B = 'org-b';

  beforeEach(async () => {
    repo = new FakeOperatorRepo();

    const module = await Test.createTestingModule({
      providers: [
        OperatorsService,
        { provide: getRepositoryToken(Operator), useValue: repo },
        { provide: getRepositoryToken(OperatorAgreement), useValue: {} },
        { provide: FileStorage, useValue: {} },
      ],
    }).compile();

    service = module.get(OperatorsService);

    await service.create(
      {
        id: 'OP-A',
        name: 'Org A Payroll Provider',
        serviceProvided: 'Payroll processing',
        contactPerson: 'A',
        contactEmail: 'a@example.com',
        contactPhone: '000',
        dataShared: 'Bank details',
        onboardedDate: '2026-01-01',
      },
      ORG_A,
    );
  });

  it('lets org A see its own operator', async () => {
    const found = await service.findOne('OP-A', ORG_A);
    expect(found.name).toBe('Org A Payroll Provider');
  });

  it("never returns org A's operator to org B — findOne", async () => {
    await expect(service.findOne('OP-A', ORG_B)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("never returns org A's operator in org B's list", async () => {
    const orgBList = await service.findAll(ORG_B);
    expect(orgBList).toHaveLength(0);
  });

  it("does not let org B update org A's operator by guessing its id", async () => {
    await expect(service.update('OP-A', { name: 'Hijacked' }, ORG_B)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const stillOwnedByA = await service.findOne('OP-A', ORG_A);
    expect(stillOwnedByA.name).toBe('Org A Payroll Provider');
  });

  it("does not let org B delete org A's operator by guessing its id", async () => {
    await expect(service.remove('OP-A', ORG_B)).rejects.toBeInstanceOf(NotFoundException);
    const stillThere = await service.findOne('OP-A', ORG_A);
    expect(stillThere).toBeDefined();
  });
});

describe('OperatorsService.assertUploadIsAcceptable', () => {
  it('rejects when no file was uploaded', () => {
    expect(() => OperatorsService.assertUploadIsAcceptable(undefined)).toThrow('No file was uploaded.');
  });

  it('rejects a file over the 10MB limit', () => {
    expect(() =>
      OperatorsService.assertUploadIsAcceptable({ size: 11 * 1024 * 1024, mimetype: 'application/pdf' }),
    ).toThrow('10MB');
  });

  it('rejects an unsupported mime type', () => {
    expect(() =>
      OperatorsService.assertUploadIsAcceptable({ size: 100, mimetype: 'application/zip' }),
    ).toThrow('PDF, JPEG and PNG');
  });

  it('accepts a valid PDF within the size limit', () => {
    expect(() =>
      OperatorsService.assertUploadIsAcceptable({ size: 100, mimetype: 'application/pdf' }),
    ).not.toThrow();
  });
});
