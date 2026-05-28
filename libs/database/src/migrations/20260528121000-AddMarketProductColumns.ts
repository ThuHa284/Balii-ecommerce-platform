import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketProductColumns20260528121000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_analysis_service.market_products
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS sold_count INT,
      ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2),
      ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS product_url TEXT,
      ADD COLUMN IF NOT EXISTS raw_data JSONB;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_market_products_platform
      ON market_analysis_service.market_products(platform);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_market_products_keyword
      ON market_analysis_service.market_products(keyword);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS market_analysis_service.idx_market_products_platform;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS market_analysis_service.idx_market_products_keyword;
    `);

    await queryRunner.query(`
      ALTER TABLE market_analysis_service.market_products
      DROP COLUMN IF EXISTS external_id,
      DROP COLUMN IF EXISTS original_price,
      DROP COLUMN IF EXISTS sold_count,
      DROP COLUMN IF EXISTS rating,
      DROP COLUMN IF EXISTS shop_name,
      DROP COLUMN IF EXISTS image_url,
      DROP COLUMN IF EXISTS product_url,
      DROP COLUMN IF EXISTS raw_data;
    `);
  }
}
