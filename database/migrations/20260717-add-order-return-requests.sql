CREATE TABLE IF NOT EXISTS order_service.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES order_service.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id
  ON order_service.return_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_user_id
  ON order_service.return_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_status
  ON order_service.return_requests(status);
