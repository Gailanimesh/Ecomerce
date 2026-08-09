import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncPaymentAddressAndOrderStatus1786275179900
  implements MigrationInterface
{
  name = 'SyncPaymentAddressAndOrderStatus1786275179900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Order Histories Table
    await queryRunner.query(
      `CREATE TYPE "public"."order_histories_status_enum" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "order_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."order_histories_status_enum" NOT NULL, "changedByUserId" character varying, "changedByRole" character varying NOT NULL DEFAULT 'SYSTEM', "changeReason" character varying, "notes" character varying, "orderId" uuid, CONSTRAINT "PK_580471ac7bdbe26a80ca6f5b7e4" PRIMARY KEY ("id"))`,
    );

    // 2. Webhook Events Table Updates
    await queryRunner.query(
      `ALTER TYPE "public"."webhook_events_status_enum" ADD VALUE IF NOT EXISTS 'IGNORED'`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webhook_events_eventId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_events" ALTER COLUMN "eventId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_events" ADD CONSTRAINT "UQ_webhook_events_eventId" UNIQUE ("eventId")`,
    );

    // 3. Payments Table Updates
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "razorpayOrderId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" character varying`,
    );

    // 4. Order Items Table Updates
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productSlug" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variantAttributes" json`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "brandName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "categoryName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "thumbnail" character varying`,
    );

    // 5. Orders Table Updates
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "orderNumber" character varying NOT NULL DEFAULT ('ORD-' || extract(epoch from now())::text)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_orderNumber" UNIQUE ("orderNumber")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('CARD', 'UPI', 'NET_BANKING', 'WALLET', 'CASH_ON_DELIVERY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" "public"."orders_paymentmethod_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentExpiresAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shippingAddressLine2" character varying`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "tax" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "grandTotal" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_histories"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."order_histories_status_enum"`,
    );
  }
}
