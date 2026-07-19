import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProductMedia1784454888608 implements MigrationInterface {
    name = 'UpdateProductMedia1784454888608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."product_media_type_enum" AS ENUM('IMAGE', 'VIDEO')`);
        await queryRunner.query(`CREATE TABLE "product_media" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "url" character varying NOT NULL, "slug" character varying NOT NULL, "type" "public"."product_media_type_enum" NOT NULL DEFAULT 'IMAGE', "altText" character varying, "displayOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "productId" uuid, CONSTRAINT "UQ_b03fc2df38b762757df80d05920" UNIQUE ("slug"), CONSTRAINT "PK_09d4639de8082a32aa27f3ac9a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b03fc2df38b762757df80d0592" ON "product_media"  ("slug") `);
        await queryRunner.query(`ALTER TABLE "product_media" ADD CONSTRAINT "FK_50e3945c6150d80b69b5f18515a" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_media" DROP CONSTRAINT "FK_50e3945c6150d80b69b5f18515a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b03fc2df38b762757df80d0592"`);
        await queryRunner.query(`DROP TABLE "product_media"`);
        await queryRunner.query(`DROP TYPE "public"."product_media_type_enum"`);
    }

}
