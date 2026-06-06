import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProductVariantFields20260530200000 implements MigrationInterface {
  name = 'UpdateProductVariantFields20260530200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      ADD COLUMN IF NOT EXISTS size_label VARCHAR(50),
      ADD COLUMN IF NOT EXISTS color_name VARCHAR(50);
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      DROP CONSTRAINT IF EXISTS chk_product_variant_item_type;
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      ADD CONSTRAINT chk_product_variant_item_type
      CHECK (item_type IN ('TOP', 'BOTTOM', 'SET'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      DROP CONSTRAINT IF EXISTS chk_product_variant_item_type;
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      ADD CONSTRAINT chk_product_variant_item_type
      CHECK (item_type IN ('TOP', 'BOTTOM'));
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      DROP COLUMN IF EXISTS color_name,
      DROP COLUMN IF EXISTS size_label;
    `);
  }
}
