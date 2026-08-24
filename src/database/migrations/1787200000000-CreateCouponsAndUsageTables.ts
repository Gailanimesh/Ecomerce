import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponsAndUsageTables1787200000000
  implements MigrationInterface
{
  name = 'CreateCouponsAndUsageTables1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."coupons_discounttype_enum" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT')`,
    );

    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "code" character varying(50) NOT NULL,
        "description" character varying(255),
        "discountType" "public"."coupons_discounttype_enum" NOT NULL,
        "discountValue" numeric(10,2) NOT NULL,
        "maxDiscountAmount" numeric(10,2),
        "minimumOrderAmount" numeric(10,2) NOT NULL DEFAULT '0.00',
        "startsAt" TIMESTAMP NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usageLimit" integer,
        "usedCount" integer NOT NULL DEFAULT 0,
        "perUserUsageLimit" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_coupons_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_coupons_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_coupons_is_active" ON "coupons" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coupons_dates" ON "coupons" ("startsAt", "expiresAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "coupon_usages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "couponId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "orderId" uuid NOT NULL,
        "discountAmount" numeric(10,2) NOT NULL,
        CONSTRAINT "PK_coupon_usages_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_coupon_usages_order_coupon" UNIQUE ("orderId", "couponId"),
        CONSTRAINT "FK_coupon_usages_coupon" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_coupon_usages_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_coupon_usages_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_coupon_usages_coupon_user" ON "coupon_usages" ("couponId", "userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coupon_usages_order" ON "coupon_usages" ("orderId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "couponCode" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "couponCode"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coupon_usages_order"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coupon_usages_coupon_user"`,
    );
    await queryRunner.query(`DROP TABLE "coupon_usages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_coupons_dates"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_coupons_is_active"`);
    await queryRunner.query(`DROP TABLE "coupons"`);
    await queryRunner.query(`DROP TYPE "public"."coupons_discounttype_enum"`);
  }
}
