import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRepeatableGiftCampaigns20260719261000 implements MigrationInterface {
  name = 'AddRepeatableGiftCampaigns20260719261000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.campaigns
      ADD COLUMN IF NOT EXISTS repeatable BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS max_applications INT;

      ALTER TABLE product_service.campaigns
      DROP CONSTRAINT IF EXISTS chk_campaign_max_applications;
      ALTER TABLE product_service.campaigns
      ADD CONSTRAINT chk_campaign_max_applications
      CHECK (max_applications IS NULL OR max_applications > 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.campaigns
      DROP CONSTRAINT IF EXISTS chk_campaign_max_applications;
      ALTER TABLE product_service.campaigns
      DROP COLUMN IF EXISTS max_applications,
      DROP COLUMN IF EXISTS repeatable;
    `);
  }
}
