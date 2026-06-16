import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTryonService20260612123000 implements MigrationInterface {
  name = 'AddTryonService20260612123000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.products
      ADD COLUMN IF NOT EXISTS target_gender VARCHAR(20) NOT NULL DEFAULT 'unisex',
      ADD COLUMN IF NOT EXISTS recommended_age_groups TEXT[] DEFAULT ARRAY['18_25', '26_35'];
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_target_gender'
        ) THEN
          ALTER TABLE product_service.products
          ADD CONSTRAINT chk_products_target_gender
          CHECK (target_gender IN ('male', 'female', 'unisex'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS tryon_service;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tryon_service.tryon_histories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        product_id UUID,
        variant_id UUID,

        fashn_job_id VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'pending',

        result_url TEXT,
        cloudinary_public_id TEXT,

        detected_gender VARCHAR(20),
        gender_confidence NUMERIC(5,4),

        detected_age_group VARCHAR(20),
        age_confidence NUMERIC(5,4),

        target_gender VARCHAR(20),
        recommended_age_groups TEXT[],

        need_confirmation BOOLEAN DEFAULT FALSE,
        user_confirmed BOOLEAN DEFAULT FALSE,

        warnings JSONB,
        suggestions JSONB,
        raw_analysis JSONB,
        raw_provider_response JSONB,

        error_code VARCHAR(100),
        error_message TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tryon_histories_user_id
      ON tryon_service.tryon_histories(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tryon_histories_product_id
      ON tryon_service.tryon_histories(product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tryon_histories_status
      ON tryon_service.tryon_histories(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tryon_histories_created_at
      ON tryon_service.tryon_histories(created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_target_gender
      ON product_service.products(target_gender);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS tryon_service.tryon_histories;
    `);

    await queryRunner.query(`
      DROP SCHEMA IF EXISTS tryon_service;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS product_service.idx_products_target_gender;
    `);

    await queryRunner.query(`
      ALTER TABLE product_service.products
      DROP CONSTRAINT IF EXISTS chk_products_target_gender,
      DROP COLUMN IF EXISTS target_gender,
      DROP COLUMN IF EXISTS recommended_age_groups;
    `);
  }
}
