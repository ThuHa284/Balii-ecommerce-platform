import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductSaleSchedule20260705100000 implements MigrationInterface {
  name = 'AddProductSaleSchedule20260705100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.products
      ADD COLUMN IF NOT EXISTS sale_start_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS sale_end_at TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.products
      DROP COLUMN IF EXISTS sale_end_at,
      DROP COLUMN IF EXISTS sale_start_at;
    `);
  }
}
