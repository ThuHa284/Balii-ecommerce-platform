import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartialReturnItemsAndRefundEvidence20260719210000 implements MigrationInterface {
  name = 'AddPartialReturnItemsAndRefundEvidence20260719210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_service.return_requests
      ADD COLUMN IF NOT EXISTS requested_refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS approved_refund_amount NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS manual_refund_amount NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS manual_refund_reference VARCHAR(200),
      ADD COLUMN IF NOT EXISTS manual_refund_note TEXT,
      ADD COLUMN IF NOT EXISTS manual_refund_evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS manual_refund_completed_by UUID;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_service.return_request_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        return_request_id UUID NOT NULL
          REFERENCES order_service.return_requests(id) ON DELETE CASCADE,
        order_item_id UUID NOT NULL
          REFERENCES order_service.order_items(id) ON DELETE RESTRICT,
        requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
        accepted_quantity INTEGER,
        disposition VARCHAR(20),
        unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
        gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
        refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ux_return_request_items_request_order_item
          UNIQUE (return_request_id, order_item_id),
        CONSTRAINT chk_return_request_items_accepted_quantity
          CHECK (
            accepted_quantity IS NULL OR
            (accepted_quantity >= 0 AND accepted_quantity <= requested_quantity)
          ),
        CONSTRAINT chk_return_request_items_disposition
          CHECK (
            disposition IS NULL OR
            disposition IN ('restock', 'damaged', 'rejected')
          )
      );

      CREATE INDEX IF NOT EXISTS ix_return_request_items_order_item
      ON order_service.return_request_items(order_item_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS order_service.return_request_items;
    `);

    await queryRunner.query(`
      ALTER TABLE order_service.return_requests
      DROP COLUMN IF EXISTS manual_refund_completed_by,
      DROP COLUMN IF EXISTS manual_refund_evidence_urls,
      DROP COLUMN IF EXISTS manual_refund_note,
      DROP COLUMN IF EXISTS manual_refund_reference,
      DROP COLUMN IF EXISTS manual_refund_amount,
      DROP COLUMN IF EXISTS approved_refund_amount,
      DROP COLUMN IF EXISTS requested_refund_amount;
    `);
  }
}
