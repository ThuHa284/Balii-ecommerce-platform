import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketAnalysis20260528113000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS market_analysis_service;
    `);

    await queryRunner.query(`
      CREATE TABLE market_analysis_service.market_products (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          platform VARCHAR(50) NOT NULL,
          keyword VARCHAR(255),
          name TEXT NOT NULL,
          price NUMERIC(12,2),
          crawled_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS market_analysis_service.market_products;
    `);

    await queryRunner.query(`
      DROP SCHEMA IF EXISTS market_analysis_service;
    `);
  }
}
