import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryMovementLedger20260719230000 implements MigrationInterface {
  name = 'AddInventoryMovementLedger20260719230000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_service.inventory_movements (
        id BIGSERIAL PRIMARY KEY,
        variant_id UUID NOT NULL
          REFERENCES product_service.product_variants(id) ON DELETE RESTRICT,
        event_type VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50),
        reference_id VARCHAR(200),
        actor_id UUID,
        stock_delta INT NOT NULL DEFAULT 0,
        reserved_delta INT NOT NULL DEFAULT 0,
        stock_after INT NOT NULL,
        reserved_after INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_inventory_movement_non_zero
          CHECK (stock_delta <> 0 OR reserved_delta <> 0),
        CONSTRAINT chk_inventory_movement_balances
          CHECK (stock_after >= 0 AND reserved_after >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_created
        ON product_service.inventory_movements(variant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference
        ON product_service.inventory_movements(reference_type, reference_id);
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION product_service.audit_inventory_movement()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_stock_delta INT;
        v_reserved_delta INT;
        v_actor_id UUID;
      BEGIN
        v_stock_delta := NEW.stock_quantity - COALESCE(OLD.stock_quantity, 0);
        v_reserved_delta := NEW.reserved_quantity - COALESCE(OLD.reserved_quantity, 0);

        IF v_stock_delta = 0 AND v_reserved_delta = 0 THEN
          RETURN NEW;
        END IF;

        BEGIN
          v_actor_id := NULLIF(current_setting('app.inventory_actor_id', TRUE), '')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
          v_actor_id := NULL;
        END;

        INSERT INTO product_service.inventory_movements (
          variant_id,
          event_type,
          reference_type,
          reference_id,
          actor_id,
          stock_delta,
          reserved_delta,
          stock_after,
          reserved_after
        ) VALUES (
          NEW.id,
          COALESCE(NULLIF(current_setting('app.inventory_event_type', TRUE), ''),
            CASE WHEN TG_OP = 'INSERT' THEN 'initial_stock' ELSE 'direct_adjustment' END),
          NULLIF(current_setting('app.inventory_reference_type', TRUE), ''),
          NULLIF(current_setting('app.inventory_reference_id', TRUE), ''),
          v_actor_id,
          v_stock_delta,
          v_reserved_delta,
          NEW.stock_quantity,
          NEW.reserved_quantity
        );

        RETURN NEW;
      END;
      $$;

      DROP TRIGGER IF EXISTS trg_audit_inventory_movement
        ON product_service.product_variants;
      CREATE TRIGGER trg_audit_inventory_movement
      AFTER INSERT OR UPDATE OF stock_quantity, reserved_quantity
      ON product_service.product_variants
      FOR EACH ROW
      EXECUTE FUNCTION product_service.audit_inventory_movement();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_audit_inventory_movement
        ON product_service.product_variants;
      DROP FUNCTION IF EXISTS product_service.audit_inventory_movement();
      DROP TABLE IF EXISTS product_service.inventory_movements;
    `);
  }
}
