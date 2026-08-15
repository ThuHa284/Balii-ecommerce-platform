import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureGoogleOAuthAccounts20260815100000 implements MigrationInterface {
  name = 'EnsureGoogleOAuthAccounts20260815100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.oauth_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL
          REFERENCES user_service.users(id) ON DELETE CASCADE,
        provider VARCHAR(30) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_oauth_provider_account
          UNIQUE (provider, provider_user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_oauth_user_id
        ON user_service.oauth_accounts(user_id);
    `);
  }

  public async down(): Promise<void> {
    // The table can predate this migration and contains user login links, so a
    // rollback intentionally keeps it instead of deleting authentication data.
  }
}
