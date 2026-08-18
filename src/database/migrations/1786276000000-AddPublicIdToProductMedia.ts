import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicIdToProductMedia1786276000000
  implements MigrationInterface
{
  name = 'AddPublicIdToProductMedia1786276000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_media" ADD "publicId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_media" DROP COLUMN "publicId"`,
    );
  }
}
