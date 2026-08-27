import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1787427669078 implements MigrationInterface {
    name = 'InitialSchema1787427669078'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "informationOfficerName" character varying, "informationOfficerEmail" character varying, "regulatorRegistrationRef" character varying, "regulatorRegistrationDate" date, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "name" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'member', "organizationId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "resetTokenHash" character varying, "resetTokenExpiresAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "operator_agreements" ("id" character varying NOT NULL, "operatorId" character varying NOT NULL, "type" character varying NOT NULL, "signedDate" character varying NOT NULL, "reviewDate" character varying NOT NULL, "referenceNumber" character varying NOT NULL, "fileUrl" character varying, "fileOriginalName" character varying, "fileMimeType" character varying, "fileSizeBytes" integer, CONSTRAINT "PK_42f52c520c1e4d61efc733136b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "operators" ("id" character varying NOT NULL, "organizationId" uuid NOT NULL, "name" character varying NOT NULL, "serviceProvided" character varying NOT NULL, "contactPerson" character varying NOT NULL, "contactEmail" character varying NOT NULL, "contactPhone" character varying NOT NULL, "dataShared" text NOT NULL, "onboardedDate" character varying NOT NULL, CONSTRAINT "PK_3d02b3692836893720335a79d1b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1d76ac0cf3de54c34567a049a1" ON "operators" ("organizationId") `);
        await queryRunner.query(`CREATE TABLE "processing_activities" ("id" character varying NOT NULL, "organizationId" uuid NOT NULL, "activityName" character varying NOT NULL, "department" character varying NOT NULL, "categoryOfDataSubjects" character varying NOT NULL, "personalInfoCollected" text NOT NULL, "specialPersonalInfo" boolean NOT NULL DEFAULT false, "purposeOfProcessing" text NOT NULL, "legalBasis" character varying NOT NULL, "retentionPeriod" character varying NOT NULL, "reviewDate" character varying NOT NULL, CONSTRAINT "PK_98cba87bf36a4d3fa9130b2a74e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6bb234e97e09702bc63690cd67" ON "processing_activities" ("organizationId") `);
        await queryRunner.query(`CREATE TABLE "assessments" ("id" character varying NOT NULL, "organizationId" uuid NOT NULL, "title" character varying NOT NULL, "assessorName" character varying NOT NULL, "date" character varying NOT NULL, "area" character varying NOT NULL, "result" character varying NOT NULL, "notes" text NOT NULL, "checklist" jsonb NOT NULL DEFAULT '[]', "findings" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_a3442bd80a00e9111cefca57f6c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d9ac406196d5e4f42bd5a2864f" ON "assessments" ("organizationId") `);
        await queryRunner.query(`CREATE TABLE "breaches" ("id" character varying NOT NULL, "organizationId" uuid NOT NULL, "title" character varying NOT NULL, "severity" character varying NOT NULL, "status" character varying NOT NULL, "dateDiscovered" character varying NOT NULL, "dateOccurred" character varying, "description" text NOT NULL, "categoryOfDataAffected" text NOT NULL, "numberOfDataSubjectsAffected" integer NOT NULL, "rootCause" text, "correctiveActions" jsonb NOT NULL DEFAULT '[]', "regulatorNotified" boolean NOT NULL DEFAULT false, "regulatorNotifiedDate" character varying, "dataSubjectsNotified" boolean NOT NULL DEFAULT false, "dataSubjectsNotifiedDate" character varying, CONSTRAINT "PK_1ae8bb9659fcd0eff82f1a7c127" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0221d25d54895d48e1a3fdd57a" ON "breaches" ("organizationId") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operator_agreements" ADD CONSTRAINT "FK_982d4e9127cdd53a60b1505a090" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operators" ADD CONSTRAINT "FK_1d76ac0cf3de54c34567a049a1c" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "processing_activities" ADD CONSTRAINT "FK_6bb234e97e09702bc63690cd67b" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assessments" ADD CONSTRAINT "FK_d9ac406196d5e4f42bd5a2864f9" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "breaches" ADD CONSTRAINT "FK_0221d25d54895d48e1a3fdd57a8" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "breaches" DROP CONSTRAINT "FK_0221d25d54895d48e1a3fdd57a8"`);
        await queryRunner.query(`ALTER TABLE "assessments" DROP CONSTRAINT "FK_d9ac406196d5e4f42bd5a2864f9"`);
        await queryRunner.query(`ALTER TABLE "processing_activities" DROP CONSTRAINT "FK_6bb234e97e09702bc63690cd67b"`);
        await queryRunner.query(`ALTER TABLE "operators" DROP CONSTRAINT "FK_1d76ac0cf3de54c34567a049a1c"`);
        await queryRunner.query(`ALTER TABLE "operator_agreements" DROP CONSTRAINT "FK_982d4e9127cdd53a60b1505a090"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0221d25d54895d48e1a3fdd57a"`);
        await queryRunner.query(`DROP TABLE "breaches"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9ac406196d5e4f42bd5a2864f"`);
        await queryRunner.query(`DROP TABLE "assessments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bb234e97e09702bc63690cd67"`);
        await queryRunner.query(`DROP TABLE "processing_activities"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1d76ac0cf3de54c34567a049a1"`);
        await queryRunner.query(`DROP TABLE "operators"`);
        await queryRunner.query(`DROP TABLE "operator_agreements"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
    }

}
