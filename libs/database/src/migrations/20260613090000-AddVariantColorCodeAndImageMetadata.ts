import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVariantColorCodeAndImageMetadata20260613090000 implements MigrationInterface {
  name = 'AddVariantColorCodeAndImageMetadata20260613090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      ADD COLUMN IF NOT EXISTS color_code VARCHAR(20);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      DROP COLUMN IF EXISTS color_code;
    `);
  }
}
