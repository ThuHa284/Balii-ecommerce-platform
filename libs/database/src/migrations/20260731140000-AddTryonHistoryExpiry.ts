import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTryonHistoryExpiry20260731140000
  implements MigrationInterface
{
  name = 'AddTryonHistoryExpiry20260731140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tryon_service.tryon_histories
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

      CREATE INDEX IF NOT EXISTS idx_tryon_histories_media_expiry
      ON tryon_service.tryon_histories (expires_at)
      WHERE cloudinary_public_id IS NOT NULL AND expires_at IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS tryon_service.idx_tryon_histories_media_expiry;

      ALTER TABLE tryon_service.tryon_histories
      DROP COLUMN IF EXISTS expires_at;
    `);
  }
}
