import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCampaignsTable20260709103000 implements MigrationInterface {
  name = 'CreateCampaignsTable20260709103000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_service.campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        slug varchar(280) NOT NULL UNIQUE,
        description text,
        short_description text,
        image_url text,
        banner_image_url text,
        product_ids uuid[] NOT NULL DEFAULT '{}',
        discount_type varchar(20) NOT NULL DEFAULT 'PERCENT',
        discount_value numeric(12, 2),
        gift_name varchar(255),
        gift_description text,
        badge_text varchar(120),
        priority_order integer NOT NULL DEFAULT 0,
        start_at timestamptz NOT NULL,
        end_at timestamptz NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS product_service.campaigns;
    `);
  }
}
