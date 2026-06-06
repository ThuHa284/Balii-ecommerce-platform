import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollections20260605110000 implements MigrationInterface {
  name = 'AddCollections20260605110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_service.collections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(280) NOT NULL UNIQUE,
        description TEXT NULL,
        short_description TEXT NULL,
        image_url TEXT NULL,
        banner_image_url TEXT NULL,
        product_ids UUID[] NOT NULL DEFAULT '{}',
        season VARCHAR(100) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS product_service.collections;
    `);
  }
}
