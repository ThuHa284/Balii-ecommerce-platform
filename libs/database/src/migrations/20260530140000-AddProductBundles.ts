import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductBundles20260530140000 implements MigrationInterface {
  name = 'AddProductBundles20260530140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE product_service.bundle_options (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          product_id UUID NOT NULL
              REFERENCES product_service.products(id)
              ON DELETE CASCADE,

          name VARCHAR(150) NOT NULL,

          top_quantity INT NOT NULL DEFAULT 0,
          bottom_quantity INT NOT NULL DEFAULT 0,

          original_price NUMERIC(12,2) NOT NULL,
          sale_price NUMERIC(12,2),

          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      ADD COLUMN item_type VARCHAR(20) NOT NULL DEFAULT 'TOP';
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      ADD CONSTRAINT chk_product_variant_item_type
      CHECK (item_type IN ('TOP', 'BOTTOM'));
    `);

    await queryRunner.query(`
      ALTER TABLE order_service.order_items
      ADD COLUMN bundle_option_id UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE order_service.order_items
      ADD COLUMN selected_items JSONB;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_order_items_bundle_option
      ON order_service.order_items(bundle_option_id);
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.products
      ADD COLUMN original_price NUMERIC(12,2);
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.products
      ADD COLUMN sale_price NUMERIC(12,2);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.products
      DROP COLUMN IF EXISTS sale_price;
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.products
      DROP COLUMN IF EXISTS original_price;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS order_service.idx_order_items_bundle_option;
    `);

    await queryRunner.query(`
      ALTER TABLE order_service.order_items
      DROP COLUMN IF EXISTS selected_items;
    `);

    await queryRunner.query(`
      ALTER TABLE order_service.order_items
      DROP COLUMN IF EXISTS bundle_option_id;
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      DROP CONSTRAINT IF EXISTS chk_product_variant_item_type;
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
      DROP COLUMN IF EXISTS item_type;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS product_service.bundle_options;
    `);
  }
}
