import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinalProductionHardening20260719262000 implements MigrationInterface {
  name = 'FinalProductionHardening20260719262000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE duplicate_count BIGINT;
      BEGIN
        SELECT COUNT(*)
        INTO duplicate_count
        FROM (
          SELECT LOWER(TRIM(email))
          FROM user_service.users
          GROUP BY LOWER(TRIM(email))
          HAVING COUNT(*) > 1
        ) duplicates;

        IF duplicate_count > 0 THEN
          RAISE EXCEPTION 'Cannot normalize user emails: % duplicate group(s) found', duplicate_count
            USING HINT = 'Merge or rename the duplicate accounts before rerunning migrations.';
        END IF;
      END
      $$;

      UPDATE user_service.users
      SET email = LOWER(TRIM(email))
      WHERE email <> LOWER(TRIM(email));

      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_normalized_email
      ON user_service.users (LOWER(email));

      ALTER TABLE user_service.users
      DROP CONSTRAINT IF EXISTS chk_users_normalized_email;
      ALTER TABLE user_service.users
      ADD CONSTRAINT chk_users_normalized_email
      CHECK (email = LOWER(TRIM(email)));

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

      ALTER TABLE user_service.users
      DROP CONSTRAINT IF EXISTS chk_users_normalized_email;

      DROP INDEX IF EXISTS user_service.ux_users_normalized_email;
    `);
  }
}
