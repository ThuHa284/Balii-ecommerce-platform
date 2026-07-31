import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackPartialRefundsAndManualReferences20260719220000 implements MigrationInterface {
  name = 'TrackPartialRefundsAndManualReferences20260719220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO payment_service.payment_statuses (code, label)
      VALUES ('partially_refunded', 'Đã hoàn tiền một phần')
      ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

      ALTER TABLE payment_service.payments
      ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

      UPDATE payment_service.payments payment
      SET refunded_amount = LEAST(refunded.total, payment.amount),
          status_id = CASE
            WHEN refunded.total >= payment.amount THEN refunded_status.id
            ELSE partial_status.id
          END
      FROM (
        SELECT r.payment_id, SUM(r.amount) AS total
        FROM payment_service.refunds r
        JOIN payment_service.payment_statuses status
          ON status.id = r.status_id
        WHERE status.code = 'refunded'
        GROUP BY r.payment_id
      ) refunded,
      payment_service.payment_statuses refunded_status,
      payment_service.payment_statuses partial_status
      WHERE payment.id = refunded.payment_id
        AND refunded_status.code = 'refunded'
        AND partial_status.code = 'partially_refunded';

      ALTER TABLE payment_service.payments
      DROP CONSTRAINT IF EXISTS chk_payments_refunded_amount;

      ALTER TABLE payment_service.payments
      ADD CONSTRAINT chk_payments_refunded_amount
      CHECK (refunded_amount >= 0 AND refunded_amount <= amount);

      CREATE UNIQUE INDEX IF NOT EXISTS ux_return_requests_manual_refund_reference
      ON order_service.return_requests(LOWER(manual_refund_reference))
      WHERE manual_refund_reference IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS order_service.ux_return_requests_manual_refund_reference;

      UPDATE payment_service.payments payment
      SET status_id = paid.id
      FROM payment_service.payment_statuses current_status,
           payment_service.payment_statuses paid
      WHERE payment.status_id = current_status.id
        AND current_status.code = 'partially_refunded'
        AND paid.code = 'paid';

      ALTER TABLE payment_service.payments
      DROP CONSTRAINT IF EXISTS chk_payments_refunded_amount;

      ALTER TABLE payment_service.payments
      DROP COLUMN IF EXISTS refunded_amount;

      DELETE FROM payment_service.payment_statuses
      WHERE code = 'partially_refunded';
    `);
  }
}
