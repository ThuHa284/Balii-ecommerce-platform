import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteReturnRefundLifecycle20260719200000 implements MigrationInterface {
  name = 'CompleteReturnRefundLifecycle20260719200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_service.orders
      DROP CONSTRAINT IF EXISTS chk_orders_inventory_state;

      ALTER TABLE order_service.orders
      ADD CONSTRAINT chk_orders_inventory_state
      CHECK (inventory_state IN ('reserved', 'committed', 'released', 'returned'));
    `);

    await queryRunner.query(`
      ALTER TABLE order_service.return_requests
      ADD COLUMN IF NOT EXISTS received_by UUID,
      ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS restocked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS refund_mode VARCHAR(20),
      ADD COLUMN IF NOT EXISTS refund_status VARCHAR(30),
      ADD COLUMN IF NOT EXISTS refund_payment_id UUID,
      ADD COLUMN IF NOT EXISTS refund_workflow_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_return_requests_active_order
      ON order_service.return_requests(order_id)
      WHERE status NOT IN ('rejected', 'completed');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS order_service.ux_return_requests_active_order;
    `);

    await queryRunner.query(`
      ALTER TABLE order_service.return_requests
      DROP COLUMN IF EXISTS completed_at,
      DROP COLUMN IF EXISTS refund_workflow_started_at,
      DROP COLUMN IF EXISTS refund_payment_id,
      DROP COLUMN IF EXISTS refund_status,
      DROP COLUMN IF EXISTS refund_mode,
      DROP COLUMN IF EXISTS restocked_at,
      DROP COLUMN IF EXISTS received_at,
      DROP COLUMN IF EXISTS received_by;
    `);

    await queryRunner.query(`
      UPDATE order_service.orders
      SET inventory_state = 'committed'
      WHERE inventory_state = 'returned';

      ALTER TABLE order_service.orders
      DROP CONSTRAINT IF EXISTS chk_orders_inventory_state;

      ALTER TABLE order_service.orders
      ADD CONSTRAINT chk_orders_inventory_state
      CHECK (inventory_state IN ('reserved', 'committed', 'released'));
    `);
  }
}
