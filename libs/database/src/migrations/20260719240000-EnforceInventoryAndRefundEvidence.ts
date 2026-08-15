import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceInventoryAndRefundEvidence20260719240000 implements MigrationInterface {
  name = 'EnforceInventoryAndRefundEvidence20260719240000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_service.product_variants
        DROP CONSTRAINT IF EXISTS chk_product_variant_inventory_balances;
      ALTER TABLE product_service.product_variants
        ADD CONSTRAINT chk_product_variant_inventory_balances
        CHECK (
          stock_quantity >= 0
          AND reserved_quantity >= 0
          AND reserved_quantity <= stock_quantity
        ) NOT VALID;
      ALTER TABLE product_service.product_variants
        VALIDATE CONSTRAINT chk_product_variant_inventory_balances;

      ALTER TABLE order_service.return_requests
        DROP CONSTRAINT IF EXISTS chk_manual_refund_has_evidence;
      ALTER TABLE order_service.return_requests
        ADD CONSTRAINT chk_manual_refund_has_evidence
        CHECK (
          refund_status <> 'manual_completed'
          OR (
            jsonb_typeof(manual_refund_evidence_urls) = 'array'
            AND jsonb_array_length(manual_refund_evidence_urls) > 0
          )
        ) NOT VALID;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM order_service.return_requests
          WHERE refund_status = 'manual_completed'
            AND (
              jsonb_typeof(manual_refund_evidence_urls) <> 'array'
              OR jsonb_array_length(manual_refund_evidence_urls) = 0
            )
        ) THEN
          ALTER TABLE order_service.return_requests
            VALIDATE CONSTRAINT chk_manual_refund_has_evidence;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_service.return_requests
        DROP CONSTRAINT IF EXISTS chk_manual_refund_has_evidence;
      ALTER TABLE product_service.product_variants
        DROP CONSTRAINT IF EXISTS chk_product_variant_inventory_balances;
    `);
  }
}
