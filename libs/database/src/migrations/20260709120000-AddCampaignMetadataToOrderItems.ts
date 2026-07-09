import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCampaignMetadataToOrderItems20260709120000 implements MigrationInterface {
  name = 'AddCampaignMetadataToOrderItems20260709120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_service.order_items
      ADD COLUMN IF NOT EXISTS campaign_id uuid,
      ADD COLUMN IF NOT EXISTS campaign_name varchar(255),
      ADD COLUMN IF NOT EXISTS campaign_discount_type varchar(20),
      ADD COLUMN IF NOT EXISTS campaign_discount_value numeric(12, 2),
      ADD COLUMN IF NOT EXISTS campaign_badge_text varchar(120);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_service.order_items
      DROP COLUMN IF EXISTS campaign_badge_text,
      DROP COLUMN IF EXISTS campaign_discount_value,
      DROP COLUMN IF EXISTS campaign_discount_type,
      DROP COLUMN IF EXISTS campaign_name,
      DROP COLUMN IF EXISTS campaign_id;
    `);
  }
}
