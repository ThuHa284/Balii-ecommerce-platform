import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckoutIdempotencyAndInventoryState20260719100000 implements MigrationInterface {
  name = 'AddCheckoutIdempotencyAndInventoryState20260719100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_service.orders
      ADD COLUMN IF NOT EXISTS checkout_idempotency_key uuid,
      ADD COLUMN IF NOT EXISTS inventory_state varchar(20) NOT NULL DEFAULT 'reserved';

      UPDATE order_service.orders
      SET checkout_idempotency_key = uuid_generate_v4()
      WHERE checkout_idempotency_key IS NULL;

      ALTER TABLE order_service.orders
      ALTER COLUMN checkout_idempotency_key SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_checkout_idempotency_key
      ON order_service.orders(checkout_idempotency_key);

      ALTER TABLE order_service.orders
      DROP CONSTRAINT IF EXISTS chk_orders_inventory_state;

      ALTER TABLE order_service.orders
      ADD CONSTRAINT chk_orders_inventory_state
      CHECK (inventory_state IN ('reserved', 'committed', 'released'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_service.orders
      DROP CONSTRAINT IF EXISTS chk_orders_inventory_state;

      DROP INDEX IF EXISTS order_service.uq_orders_checkout_idempotency_key;

      ALTER TABLE order_service.orders
      DROP COLUMN IF EXISTS inventory_state,
      DROP COLUMN IF EXISTS checkout_idempotency_key;
    `);
  }
}
