-- User Service Indexes
CREATE INDEX idx_users_role_id
ON user_service.users(role_id);

CREATE INDEX idx_users_created_at
ON user_service.users(created_at);

CREATE INDEX idx_oauth_user_id
ON user_service.oauth_accounts(user_id);

-- Product Service Indexes
CREATE INDEX idx_products_category_id
ON product_service.products(category_id);

CREATE INDEX idx_products_slug
ON product_service.products(slug);

CREATE INDEX idx_products_active
ON product_service.products(is_active);

CREATE INDEX idx_variants_product_id
ON product_service.product_variants(product_id);

CREATE INDEX idx_variants_sku
ON product_service.product_variants(sku);

CREATE INDEX idx_reviews_product_id
ON product_service.reviews(product_id);

CREATE INDEX idx_reviews_user_id
ON product_service.reviews(user_id);

-- Order Service Indexes
CREATE INDEX idx_orders_user_id
ON order_service.orders(user_id);

CREATE INDEX idx_orders_status_id
ON order_service.orders(status_id);

CREATE INDEX idx_orders_created_at
ON order_service.orders(created_at);

CREATE INDEX idx_order_items_order_id
ON order_service.order_items(order_id);

CREATE INDEX idx_order_logs_order_id
ON order_service.order_status_logs(order_id);

-- Payment Service Indexes
CREATE INDEX idx_payments_order_id
ON payment_service.payments(order_id);

CREATE INDEX idx_payments_user_id
ON payment_service.payments(user_id);

CREATE INDEX idx_payments_status_id
ON payment_service.payments(status_id);

CREATE INDEX idx_refunds_payment_id
ON payment_service.refunds(payment_id);

-- Voucher Service Indexes
CREATE INDEX idx_vouchers_code
ON voucher_service.vouchers(code);

CREATE INDEX idx_vouchers_active
ON voucher_service.vouchers(is_active);

CREATE INDEX idx_voucher_usage_user_id
ON voucher_service.voucher_usages(user_id);

-- Notification Service Indexes
CREATE INDEX idx_notifications_user_id
ON notification_service.notifications(user_id);

CREATE INDEX idx_notifications_status_id
ON notification_service.notifications(status_id);

-- Afiliate Service Indexes
CREATE INDEX idx_affiliates_user_id
ON affiliate_service.affiliates(user_id);

CREATE INDEX idx_commissions_affiliate_id
ON affiliate_service.commissions(affiliate_id);

-- 