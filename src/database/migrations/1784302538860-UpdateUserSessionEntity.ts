import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserSessionEntity1784302538860 implements MigrationInterface {
    name = 'UpdateUserSessionEntity1784302538860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "ipAddress" character varying(45)`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "userAgent"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "userAgent" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_57de40bc620f456c7311aa3a1e" ON "sessions"  ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_50762206f116cd47d1c3fec396" ON "sessions"  ("expiresAt") `);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50762206f116cd47d1c3fec396"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_57de40bc620f456c7311aa3a1e"`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "userAgent"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "userAgent" character varying`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "ipAddress" character varying`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "expiresAt" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}
