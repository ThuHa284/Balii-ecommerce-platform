import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradeRefundWorkflow20260624193000
  implements MigrationInterface
{
  name = 'UpgradeRefundWorkflow20260624193000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_service.refunds
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS failure_reason TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_refunds_idempotency_key
      ON payment_service.refunds(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS payment_service.ux_refunds_idempotency_key;
    `);

    await queryRunner.query(`
      ALTER TABLE payment_service.refunds
      DROP COLUMN IF EXISTS updated_at,
      DROP COLUMN IF EXISTS failure_reason,
      DROP COLUMN IF EXISTS metadata,
      DROP COLUMN IF EXISTS idempotency_key;
    `);
  }
}
