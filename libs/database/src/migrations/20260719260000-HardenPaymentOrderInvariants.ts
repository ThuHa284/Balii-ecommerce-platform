import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenPaymentOrderInvariants20260719260000 implements MigrationInterface {
  name = 'HardenPaymentOrderInvariants20260719260000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_service.payments
      ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

      UPDATE payment_service.payments
      SET is_simulated = TRUE
      WHERE provider_ref LIKE 'SIM\\_%' ESCAPE '\\'
         OR metadata->>'source' IN ('production-simulation', 'admin-simulation');

      WITH duplicates AS (
        SELECT id, provider_ref,
               ROW_NUMBER() OVER (PARTITION BY provider_ref ORDER BY created_at, id) AS row_number
        FROM payment_service.payments
        WHERE provider_ref IS NOT NULL
      )
      UPDATE payment_service.payments payment
      SET provider_ref = payment.provider_ref || '_' || REPLACE(payment.id::text, '-', '')
      FROM duplicates duplicate
      WHERE duplicate.id = payment.id
        AND duplicate.row_number > 1;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_provider_ref
      ON payment_service.payments(provider_ref)
      WHERE provider_ref IS NOT NULL;

      WITH duplicates AS (
        SELECT id, provider_refund_id,
               ROW_NUMBER() OVER (PARTITION BY provider_refund_id ORDER BY created_at, id) AS row_number
        FROM payment_service.refunds
        WHERE provider_refund_id IS NOT NULL
      )
      UPDATE payment_service.refunds refund
      SET provider_refund_id = refund.provider_refund_id || '_' || REPLACE(refund.id::text, '-', '')
      FROM duplicates duplicate
      WHERE duplicate.id = refund.id
        AND duplicate.row_number > 1;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_refunds_provider_refund_id
      ON payment_service.refunds(provider_refund_id)
      WHERE provider_refund_id IS NOT NULL;

      ALTER TABLE payment_service.payments
      DROP CONSTRAINT IF EXISTS chk_payments_amount_positive;
      ALTER TABLE payment_service.payments
      ADD CONSTRAINT chk_payments_amount_positive CHECK (amount >= 0);

      ALTER TABLE payment_service.refunds
      DROP CONSTRAINT IF EXISTS chk_refunds_amount_positive;
      ALTER TABLE payment_service.refunds
      ADD CONSTRAINT chk_refunds_amount_positive CHECK (amount > 0);

      ALTER TABLE order_service.orders
      DROP CONSTRAINT IF EXISTS chk_orders_money_nonnegative;
      ALTER TABLE order_service.orders
      ADD CONSTRAINT chk_orders_money_nonnegative
      CHECK (
        subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0
        AND total_amount >= 0
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_voucher_usages_order
      ON voucher_service.voucher_usages(order_id)
      WHERE order_id IS NOT NULL;

      ALTER TABLE product_service.products
      DROP CONSTRAINT IF EXISTS chk_products_price_invariants;
      ALTER TABLE product_service.products
      ADD CONSTRAINT chk_products_price_invariants CHECK (
        base_price >= 0
        AND (original_price IS NULL OR original_price >= base_price)
        AND (sale_price IS NULL OR (sale_price >= 0 AND sale_price <= base_price))
      );

      ALTER TABLE product_service.product_variants
      DROP CONSTRAINT IF EXISTS chk_product_variants_price_nonnegative;
      ALTER TABLE product_service.product_variants
      ADD CONSTRAINT chk_product_variants_price_nonnegative
      CHECK (price IS NULL OR price >= 0);

      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id) AS row_number
        FROM user_service.user_addresses
        WHERE is_default = TRUE
      )
      UPDATE user_service.user_addresses address
      SET is_default = FALSE
      FROM ranked
      WHERE ranked.id = address.id AND ranked.row_number > 1;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_user_addresses_one_default
      ON user_service.user_addresses(user_id)
      WHERE is_default = TRUE;

      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY sort_order, id) AS row_number
        FROM product_service.product_images
        WHERE is_primary = TRUE
      )
      UPDATE product_service.product_images image
      SET is_primary = FALSE
      FROM ranked
      WHERE ranked.id = image.id AND ranked.row_number > 1;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_one_primary
      ON product_service.product_images(product_id)
      WHERE is_primary = TRUE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS voucher_service.ux_voucher_usages_order;
      DROP INDEX IF EXISTS user_service.ux_user_addresses_one_default;
      DROP INDEX IF EXISTS product_service.ux_product_images_one_primary;

      ALTER TABLE product_service.product_variants
      DROP CONSTRAINT IF EXISTS chk_product_variants_price_nonnegative;
      ALTER TABLE product_service.products
      DROP CONSTRAINT IF EXISTS chk_products_price_invariants;

      ALTER TABLE order_service.orders
      DROP CONSTRAINT IF EXISTS chk_orders_money_nonnegative;

      ALTER TABLE payment_service.refunds
      DROP CONSTRAINT IF EXISTS chk_refunds_amount_positive;
      ALTER TABLE payment_service.payments
      DROP CONSTRAINT IF EXISTS chk_payments_amount_positive;

      DROP INDEX IF EXISTS payment_service.ux_refunds_provider_refund_id;
      DROP INDEX IF EXISTS payment_service.ux_payments_provider_ref;

      ALTER TABLE payment_service.payments
      DROP COLUMN IF EXISTS is_simulated;
    `);
  }
}
