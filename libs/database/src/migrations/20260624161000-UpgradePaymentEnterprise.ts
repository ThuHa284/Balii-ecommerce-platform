import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradePaymentEnterprise20260624161000 implements MigrationInterface {
  name = 'UpgradePaymentEnterprise20260624161000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.query(`
      ALTER TABLE payment_service.payments
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
      ADD COLUMN IF NOT EXISTS merchant_txn_id VARCHAR(120),
      ADD COLUMN IF NOT EXISTS failure_reason TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_merchant_txn_id
      ON payment_service.payments(merchant_txn_id)
      WHERE merchant_txn_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_idempotency_key
      ON payment_service.payments(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE payment_service.payment_webhooks
      ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(200),
      ADD COLUMN IF NOT EXISTS provider_txn_id VARCHAR(200),
      ADD COLUMN IF NOT EXISTS event_type VARCHAR(80),
      ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30) DEFAULT 'RECEIVED',
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(128);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_webhooks_provider_event
      ON payment_service.payment_webhooks(provider_event_id)
      WHERE provider_event_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_webhooks_payload_hash
      ON payment_service.payment_webhooks(payload_hash)
      WHERE payload_hash IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE payment_service.outbox_events
      ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_error TEXT,
      ADD COLUMN IF NOT EXISTS event_id UUID DEFAULT uuid_generate_v4();
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_outbox_event_id
      ON payment_service.outbox_events(event_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS payment_service.ux_payment_outbox_event_id;
    `);

    await queryRunner.query(`
      ALTER TABLE payment_service.outbox_events
      DROP COLUMN IF EXISTS event_id,
      DROP COLUMN IF EXISTS last_error,
      DROP COLUMN IF EXISTS published_at,
      DROP COLUMN IF EXISTS next_retry_at,
      DROP COLUMN IF EXISTS retry_count;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS payment_service.ux_payment_webhooks_payload_hash;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS payment_service.ux_payment_webhooks_provider_event;
    `);

    await queryRunner.query(`
      ALTER TABLE payment_service.payment_webhooks
      DROP COLUMN IF EXISTS payload_hash,
      DROP COLUMN IF EXISTS error_message,
      DROP COLUMN IF EXISTS processing_status,
      DROP COLUMN IF EXISTS event_type,
      DROP COLUMN IF EXISTS provider_txn_id,
      DROP COLUMN IF EXISTS provider_event_id;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS payment_service.ux_payments_idempotency_key;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS payment_service.ux_payments_merchant_txn_id;
    `);

    await queryRunner.query(`
      ALTER TABLE payment_service.payments
      DROP COLUMN IF EXISTS updated_at,
      DROP COLUMN IF EXISTS metadata,
      DROP COLUMN IF EXISTS failure_reason,
      DROP COLUMN IF EXISTS merchant_txn_id,
      DROP COLUMN IF EXISTS idempotency_key;
    `);
  }
}
