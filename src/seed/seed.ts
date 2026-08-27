/**
 * Loads a realistic demo dataset into Postgres via TypeORM. Every run
 * creates one fixed demo tenant ("Sizwe Data Protection Consultants") with
 * one admin login and attaches organizationId to every seeded operator/
 * processing activity/assessment/breach, so the multi-tenant scoping in
 * every service has real data to prove it works against.
 *
 * Run with: npm run seed
 */
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { Operator } from '../operators/entities/operator.entity';
import { OperatorAgreement } from '../operators/entities/operator-agreement.entity';
import { ProcessingActivity } from '../processing-activities/entities/processing-activity.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { Breach } from '../breaches/entities/breach.entity';

// Fixed id (not random) so re-running the seed is idempotent.
const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_ADMIN_EMAIL = 'demo@popiaguard.co.za';
const DEMO_ADMIN_PASSWORD = 'POPIAGuard2026!';

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Organization, User, Operator, OperatorAgreement, ProcessingActivity, Assessment, Breach],
    synchronize: false,
  });
  await dataSource.initialize();

  const orgsRepo = dataSource.getRepository(Organization);
  const usersRepo = dataSource.getRepository(User);
  const operatorsRepo = dataSource.getRepository(Operator);
  const agreementsRepo = dataSource.getRepository(OperatorAgreement);
  const activitiesRepo = dataSource.getRepository(ProcessingActivity);
  const assessmentsRepo = dataSource.getRepository(Assessment);
  const breachesRepo = dataSource.getRepository(Breach);

  // --- Clear this demo tenant's data (idempotent re-seed) ------------------
  await breachesRepo.delete({ organizationId: DEMO_ORG_ID });
  await assessmentsRepo.delete({ organizationId: DEMO_ORG_ID });
  await activitiesRepo.delete({ organizationId: DEMO_ORG_ID });
  const existingOperators = await operatorsRepo.find({ where: { organizationId: DEMO_ORG_ID } });
  for (const op of existingOperators) {
    await agreementsRepo.delete({ operatorId: op.id });
  }
  await operatorsRepo.delete({ organizationId: DEMO_ORG_ID });
  await usersRepo.delete({ organizationId: DEMO_ORG_ID });
  await orgsRepo.delete({ id: DEMO_ORG_ID });

  // --- Organization + admin --------------------------------------------------
  await orgsRepo.save(
    orgsRepo.create({
      id: DEMO_ORG_ID,
      name: 'Sizwe Data Protection Consultants',
      informationOfficerName: 'Nomvula Sizwe',
      informationOfficerEmail: 'nomvula@sizweconsultants.co.za',
      regulatorRegistrationRef: 'IR-2024-004821',
      regulatorRegistrationDate: '2024-03-11',
    }),
  );

  const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);
  await usersRepo.save(
    usersRepo.create({
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      name: 'Nomvula Sizwe',
      role: 'admin',
      organizationId: DEMO_ORG_ID,
      status: 'active',
    }),
  );

  // --- Operators + agreements -------------------------------------------------
  const operatorSeeds = [
    {
      id: 'OP-001',
      name: 'SimplePay (Pty) Ltd',
      serviceProvided: 'Payroll processing',
      contactPerson: 'Werner Botha',
      contactEmail: 'support@simplepay.co.za',
      contactPhone: '021 300 3000',
      dataShared: 'Employee ID numbers, bank details, salary information, tax numbers.',
      onboardedDate: '2023-02-01',
      agreements: [
        { type: 'Operator Agreement (s21)', signedDate: '2023-02-01', reviewDate: daysFromToday(280), referenceNumber: 'OA-SP-001' },
      ],
    },
    {
      id: 'OP-002',
      name: 'Amazon Web Services',
      serviceProvided: 'Cloud hosting',
      contactPerson: 'AWS Enterprise Support',
      contactEmail: 'aws-enterprise-support@amazon.com',
      contactPhone: '0800 982 950',
      dataShared: 'All customer and employee records stored in the production database.',
      onboardedDate: '2022-06-15',
      agreements: [
        { type: 'Data Processing Addendum', signedDate: '2022-06-15', reviewDate: daysFromToday(15), referenceNumber: 'DPA-AWS-2022' },
      ],
    },
    {
      id: 'OP-003',
      name: 'Debt Rescue SA',
      serviceProvided: 'Overdue account collections',
      contactPerson: 'Priya Naidoo',
      contactEmail: 'priya@debtrescue.co.za',
      contactPhone: '011 555 0199',
      dataShared: "Customer names, contact details, and outstanding balances for accounts over 90 days.",
      onboardedDate: '2021-09-10',
      agreements: [
        { type: 'Operator Agreement (s21)', signedDate: '2021-09-10', reviewDate: daysFromToday(-14), referenceNumber: 'OA-DR-2021' },
      ],
    },
    {
      id: 'OP-004',
      name: 'Mailchimp (Intuit Inc.)',
      serviceProvided: 'Marketing email delivery',
      contactPerson: 'Mailchimp Support',
      contactEmail: 'support@mailchimp.com',
      contactPhone: 'N/A (US-based)',
      dataShared: 'Customer names and email addresses who opted in to the newsletter.',
      onboardedDate: '2023-11-01',
      agreements: [],
    },
    {
      id: 'OP-005',
      name: 'iStore Repairs (Pty) Ltd',
      serviceProvided: 'Device repair and data recovery',
      contactPerson: 'Sipho Mahlangu',
      contactEmail: 'sipho@istorerepairs.co.za',
      contactPhone: '010 900 4040',
      dataShared: 'Whatever personal data happens to be on a device sent in for repair.',
      onboardedDate: '2024-01-20',
      agreements: [
        { type: 'Non-Disclosure Agreement', signedDate: '2024-01-20', reviewDate: daysFromToday(400), referenceNumber: 'NDA-IST-2024' },
      ],
    },
  ];

  for (const op of operatorSeeds) {
    await operatorsRepo.save(
      operatorsRepo.create({
        id: op.id,
        organizationId: DEMO_ORG_ID,
        name: op.name,
        serviceProvided: op.serviceProvided,
        contactPerson: op.contactPerson,
        contactEmail: op.contactEmail,
        contactPhone: op.contactPhone,
        dataShared: op.dataShared,
        onboardedDate: op.onboardedDate,
        agreements: [],
      }),
    );
    for (const [i, ag] of op.agreements.entries()) {
      await agreementsRepo.save(
        agreementsRepo.create({
          id: `${op.id}-AG-${i + 1}`,
          operatorId: op.id,
          type: ag.type,
          signedDate: ag.signedDate,
          reviewDate: ag.reviewDate,
          referenceNumber: ag.referenceNumber,
          fileUrl: null,
          fileOriginalName: null,
          fileMimeType: null,
          fileSizeBytes: null,
        }),
      );
    }
  }

  // --- Processing activities (ROPA) -------------------------------------------
  const activitySeeds = [
    {
      id: 'PA-001',
      activityName: 'Employee payroll processing',
      department: 'HR',
      categoryOfDataSubjects: 'Employees' as const,
      personalInfoCollected: 'ID number, banking details, tax number, salary, medical aid contributions.',
      specialPersonalInfo: false,
      purposeOfProcessing: 'To pay employees accurately and meet tax/UIF obligations.',
      legalBasis: 'Contract' as const,
      retentionPeriod: '5 years after employment ends (SARS record-keeping requirement)',
      reviewDate: daysFromToday(200),
    },
    {
      id: 'PA-002',
      activityName: 'CCTV surveillance at office premises',
      department: 'Facilities',
      categoryOfDataSubjects: 'Employees' as const,
      personalInfoCollected: 'Video footage of everyone entering/exiting the building.',
      specialPersonalInfo: true,
      purposeOfProcessing: 'Physical security and incident investigation.',
      legalBasis: 'Legitimate Interest' as const,
      retentionPeriod: '30 days, then automatically overwritten',
      reviewDate: daysFromToday(10),
    },
    {
      id: 'PA-003',
      activityName: 'Job applicant screening',
      department: 'HR',
      categoryOfDataSubjects: 'Job Applicants' as const,
      personalInfoCollected: 'CV contents, ID copy, qualification certificates, reference contacts.',
      specialPersonalInfo: false,
      purposeOfProcessing: 'To evaluate candidates for open roles.',
      legalBasis: 'Consent' as const,
      retentionPeriod: '12 months, then deleted if unsuccessful',
      reviewDate: daysFromToday(-5),
    },
    {
      id: 'PA-004',
      activityName: 'Customer order and delivery records',
      department: 'Operations',
      categoryOfDataSubjects: 'Customers' as const,
      personalInfoCollected: 'Name, delivery address, phone number, order history.',
      specialPersonalInfo: false,
      purposeOfProcessing: 'To fulfil and deliver customer orders.',
      legalBasis: 'Contract' as const,
      retentionPeriod: '5 years (consumer protection / warranty claims)',
      reviewDate: daysFromToday(150),
    },
    {
      id: 'PA-005',
      activityName: 'Marketing email list',
      department: 'Marketing',
      categoryOfDataSubjects: 'Customers' as const,
      personalInfoCollected: 'Name and email address of newsletter subscribers.',
      specialPersonalInfo: false,
      purposeOfProcessing: 'Direct marketing of new products and promotions.',
      legalBasis: 'Consent' as const,
      retentionPeriod: 'Until the subscriber unsubscribes',
      reviewDate: daysFromToday(20),
    },
    {
      id: 'PA-006',
      activityName: 'Website analytics',
      department: 'Marketing',
      categoryOfDataSubjects: 'Website Visitors' as const,
      personalInfoCollected: 'IP address, device/browser info, pages viewed.',
      specialPersonalInfo: false,
      purposeOfProcessing: 'To understand site usage and improve the website.',
      legalBasis: 'Legitimate Interest' as const,
      retentionPeriod: '26 months (Google Analytics default)',
      reviewDate: daysFromToday(60),
    },
  ];

  for (const a of activitySeeds) {
    await activitiesRepo.save(activitiesRepo.create({ ...a, organizationId: DEMO_ORG_ID }));
  }

  // --- Assessments (self-audits) -----------------------------------------------
  await assessmentsRepo.save(
    assessmentsRepo.create({
      id: 'POPIA-2026-001',
      organizationId: DEMO_ORG_ID,
      title: 'Q1 2026 POPIA Self-Assessment',
      assessorName: 'Nomvula Sizwe',
      date: daysFromToday(-40),
      area: 'Organization-wide',
      result: 'Findings Raised',
      notes: 'Annual baseline assessment covering operator agreements, ROPA completeness, and breach-response readiness.',
      checklist: [
        { id: 'c1', label: 'Every operator has a signed s21 agreement on file', status: 'Fail', note: 'Mailchimp has no agreement in place.' },
        { id: 'c2', label: 'ROPA is reviewed and up to date', status: 'Pass' },
        { id: 'c3', label: 'A documented breach-response procedure exists', status: 'Pass' },
        { id: 'c4', label: 'PAIA manual is published and current', status: 'Fail', note: "Manual hasn't been updated since 2022." },
        { id: 'c5', label: 'Staff have received POPIA awareness training in the last 12 months', status: 'Pass' },
      ],
      findings: [
        { id: 'FND-2026-001-1', checklistItemLabel: 'Every operator has a signed s21 agreement on file', description: 'Mailchimp has no agreement in place.', status: 'Open', raisedBy: 'Nomvula Sizwe', raisedDate: daysFromToday(-40) },
        { id: 'FND-2026-001-2', checklistItemLabel: 'PAIA manual is published and current', description: "Manual hasn't been updated since 2022.", status: 'In Progress', raisedBy: 'Nomvula Sizwe', raisedDate: daysFromToday(-40) },
      ],
    }),
  );

  // --- Breaches ------------------------------------------------------------------
  await breachesRepo.save(
    breachesRepo.create({
      id: 'BR-2025-001',
      organizationId: DEMO_ORG_ID,
      title: 'Misdirected email containing customer order list',
      severity: 'Medium',
      status: 'Closed',
      dateDiscovered: '2025-11-03',
      dateOccurred: '2025-11-03',
      description: 'An operations staff member emailed a customer order export to the wrong recipient (a similarly-named external contact).',
      categoryOfDataAffected: 'Customer names, addresses, phone numbers (47 records)',
      numberOfDataSubjectsAffected: 47,
      rootCause: 'Autocomplete selected the wrong contact; no confirmation step before sending files externally.',
      correctiveActions: [
        { id: 'ca1', description: 'Recipient confirmed deletion of the email and attachment in writing.', owner: 'Nomvula Sizwe', dueDate: '2025-11-05', done: true },
        { id: 'ca2', description: 'Added a warning prompt for external recipients on outgoing attachments.', owner: 'IT', dueDate: '2025-11-10', done: true },
      ],
      regulatorNotified: false,
      regulatorNotifiedDate: null,
      dataSubjectsNotified: false,
      dataSubjectsNotifiedDate: null,
    }),
  );

  await breachesRepo.save(
    breachesRepo.create({
      id: 'BR-2026-001',
      organizationId: DEMO_ORG_ID,
      title: 'Unauthorized access to HR payroll folder',
      severity: 'Reportable',
      status: 'Investigating',
      dateDiscovered: daysFromToday(-3),
      dateOccurred: null,
      description: 'A shared drive permissions error briefly exposed the full payroll folder (salaries, bank details, ID numbers) to all staff, not just HR.',
      categoryOfDataAffected: 'Employee ID numbers, bank account details, salaries (62 records)',
      numberOfDataSubjectsAffected: 62,
      rootCause: null,
      correctiveActions: [
        { id: 'ca1', description: 'Permissions corrected and access logs pulled to confirm who viewed the folder.', owner: 'IT', dueDate: daysFromToday(2), done: false },
      ],
      regulatorNotified: false,
      regulatorNotifiedDate: null,
      dataSubjectsNotified: false,
      dataSubjectsNotifiedDate: null,
    }),
  );

  await dataSource.destroy();

  console.log('Seed complete.');
  console.log(`Demo login: ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
