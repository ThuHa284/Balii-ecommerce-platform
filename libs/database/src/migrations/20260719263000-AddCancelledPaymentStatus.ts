import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledPaymentStatus20260719263000 implements MigrationInterface {
  name = 'AddCancelledPaymentStatus20260719263000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO payment_service.payment_statuses (code, label)
      VALUES ('cancelled', 'Đã hủy')
      ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_service.payments payment
      SET status_id = failed.id,
          failure_reason = COALESCE(payment.failure_reason, 'Order cancelled')
      FROM payment_service.payment_statuses cancelled,
           payment_service.payment_statuses failed
      WHERE payment.status_id = cancelled.id
        AND cancelled.code = 'cancelled'
        AND failed.code = 'failed';

      DELETE FROM payment_service.payment_statuses WHERE code = 'cancelled';
    `);
  }
}
