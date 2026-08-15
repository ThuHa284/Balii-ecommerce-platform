import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteVoucherConfiguration20260719264000 implements MigrationInterface {
  name = 'CompleteVoucherConfiguration20260719264000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO voucher_service.voucher_types (code, label)
      VALUES
        ('percent', 'Giảm theo phần trăm'),
        ('fixed', 'Giảm số tiền cố định')
      ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

      ALTER TABLE voucher_service.vouchers
      ADD COLUMN IF NOT EXISTS name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS description TEXT;

      UPDATE voucher_service.vouchers
      SET name = code
      WHERE name IS NULL OR TRIM(name) = '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE voucher_service.vouchers
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS name;

      DELETE FROM voucher_service.voucher_types type
      WHERE type.code IN ('percent', 'fixed')
        AND NOT EXISTS (
          SELECT 1 FROM voucher_service.vouchers voucher
          WHERE voucher.type_id = type.id
        );
    `);
  }
}
