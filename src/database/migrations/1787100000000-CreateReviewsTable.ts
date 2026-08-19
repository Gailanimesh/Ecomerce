import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsTable1787100000000 implements MigrationInterface {
  name = 'CreateReviewsTable1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."reviews_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "orderItemId" uuid NOT NULL,
        "rating" integer NOT NULL,
        "title" character varying(150),
        "content" text NOT NULL,
        "status" "public"."reviews_status_enum" NOT NULL DEFAULT 'PENDING',
        "adminReason" text,
        "moderatedByUserId" uuid,
        "moderatedAt" TIMESTAMP,
        CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reviews_user_product" UNIQUE ("userId", "productId"),
        CONSTRAINT "FK_reviews_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_reviews_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_reviews_order_item" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_product_status" ON "reviews" ("productId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_status" ON "reviews" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_created_at" ON "reviews" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_product_status"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TYPE "public"."reviews_status_enum"`);
  }
}
