import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManagedMediaAssets20260719250000 implements MigrationInterface {
  name = 'AddManagedMediaAssets20260719250000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_service.media_assets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        public_id VARCHAR(500) NOT NULL UNIQUE,
        url TEXT NOT NULL UNIQUE,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        owner_type VARCHAR(50),
        owner_id UUID,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        attached_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_media_asset_status
          CHECK (status IN ('pending', 'attached', 'pending_delete')),
        CONSTRAINT chk_media_asset_owner
          CHECK (
            (status = 'attached' AND owner_type IS NOT NULL AND owner_id IS NOT NULL)
            OR status <> 'attached'
          )
      );

      CREATE INDEX IF NOT EXISTS idx_media_assets_cleanup
        ON product_service.media_assets(status, uploaded_at);
      CREATE INDEX IF NOT EXISTS idx_media_assets_owner
        ON product_service.media_assets(owner_type, owner_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS product_service.media_assets;
    `);
  }
}
