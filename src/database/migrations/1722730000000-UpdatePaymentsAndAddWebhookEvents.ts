import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePaymentsAndAddWebhookEvents1722730000000
  implements MigrationInterface
{
  name = 'UpdatePaymentsAndAddWebhookEvents1722730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend PaymentStatus enum
    await queryRunner.query(
      `ALTER TYPE "public"."payments_status_enum" ADD VALUE IF NOT EXISTS 'EXPIRED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."payments_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'`,
    );

    // 2. Create PaymentFailureCode enum type
    await queryRunner.query(
      `CREATE TYPE "public"."payments_failurecode_enum" AS ENUM('SIGNATURE_INVALID', 'PAYMENT_TIMEOUT', 'PAYMENT_DECLINED', 'NETWORK_ERROR', 'WEBHOOK_DUPLICATE', 'GATEWAY_ERROR', 'AMOUNT_MISMATCH')`,
    );

    // 3. Create PaymentProvider enum type
    await queryRunner.query(
      `CREATE TYPE "public"."payments_provider_enum" AS ENUM('RAZORPAY', 'MOCK', 'STRIPE')`,
    );

    // 4. Create WebhookStatus enum type
    await queryRunner.query(
      `CREATE TYPE "public"."webhook_events_status_enum" AS ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED')`,
    );

    // 5. Update payments table provider & failureCode columns
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "failureCode" "public"."payments_failurecode_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "provider" TYPE "public"."payments_provider_enum" USING 'RAZORPAY'::"public"."payments_provider_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'RAZORPAY'`,
    );

    // 6. Create webhook_events table
    await queryRunner.query(
      `CREATE TABLE "webhook_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "provider" "public"."payments_provider_enum" NOT NULL DEFAULT 'RAZORPAY',
        "eventId" character varying,
        "eventType" character varying,
        "signature" character varying,
        "headers" jsonb,
        "payload" jsonb NOT NULL,
        "status" "public"."webhook_events_status_enum" NOT NULL DEFAULT 'RECEIVED',
        "failureReason" character varying,
        "receivedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP,
        CONSTRAINT "PK_webhook_events_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_events_eventId" ON "webhook_events" ("eventId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_eventId"`);
    await queryRunner.query(`DROP TABLE "webhook_events"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "failureCode"`);
    await queryRunner.query(`DROP TYPE "public"."webhook_events_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_failurecode_enum"`);
  }
}
