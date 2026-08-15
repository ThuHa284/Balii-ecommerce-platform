import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfigurableGiftCampaignRules20260719103000 implements MigrationInterface {
  name = 'AddConfigurableGiftCampaignRules20260719103000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.campaigns
      ADD COLUMN IF NOT EXISTS minimum_purchase_quantity int NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS gift_variant_id uuid,
      ADD COLUMN IF NOT EXISTS gift_quantity int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gift_unit_price numeric(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stackable_with_sale boolean NOT NULL DEFAULT FALSE;

      ALTER TABLE product_service.campaigns
      DROP CONSTRAINT IF EXISTS chk_campaign_gift_rule;

      ALTER TABLE product_service.campaigns
      ADD CONSTRAINT chk_campaign_gift_rule CHECK (
        minimum_purchase_quantity > 0
        AND gift_quantity >= 0
        AND gift_unit_price >= 0
        AND (
          discount_type <> 'GIFT'
          OR (gift_variant_id IS NOT NULL AND gift_quantity > 0)
        )
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.campaigns
      DROP CONSTRAINT IF EXISTS chk_campaign_gift_rule;

      ALTER TABLE product_service.campaigns
      DROP COLUMN IF EXISTS stackable_with_sale,
      DROP COLUMN IF EXISTS gift_unit_price,
      DROP COLUMN IF EXISTS gift_quantity,
      DROP COLUMN IF EXISTS gift_variant_id,
      DROP COLUMN IF EXISTS minimum_purchase_quantity;
    `);
  }
}
