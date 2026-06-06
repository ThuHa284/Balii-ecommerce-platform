import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublic_IDProductImages20260530190000 implements MigrationInterface {
  name = 'AddPublic_IDProductImages20260530190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.product_images
      ADD COLUMN public_id TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.product_images
      DROP COLUMN IF EXISTS public_id;
    `);
  }
}
