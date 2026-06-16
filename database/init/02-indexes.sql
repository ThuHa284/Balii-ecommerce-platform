-- User Service Indexes
CREATE INDEX IF NOT EXISTS idx_users_role_id
ON user_service.users(role_id);

CREATE INDEX IF NOT EXISTS idx_users_created_at
ON user_service.users(created_at);

CREATE INDEX IF NOT EXISTS idx_oauth_user_id
ON user_service.oauth_accounts(user_id);

-- Product Service Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id
ON product_service.products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_slug
ON product_service.products(slug);

CREATE INDEX IF NOT EXISTS idx_products_active
ON product_service.products(is_active);

CREATE INDEX IF NOT EXISTS idx_variants_product_id
ON product_service.product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_variants_sku
ON product_service.product_variants(sku);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id
ON product_service.reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
ON product_service.reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
ON product_service.product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_variant_id
ON product_service.product_images(variant_id);

CREATE INDEX IF NOT EXISTS idx_bundle_options_product_id
ON product_service.bundle_options(product_id);

CREATE INDEX IF NOT EXISTS idx_bundle_options_active
ON product_service.bundle_options(is_active);

CREATE INDEX IF NOT EXISTS idx_collections_is_active
ON product_service.collections(is_active);

CREATE INDEX IF NOT EXISTS idx_collections_season
ON product_service.collections(season);

CREATE INDEX IF NOT EXISTS idx_collections_created_at
ON product_service.collections(created_at DESC);

-- Order Service Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON order_service.orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status_id
ON order_service.orders(status_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON order_service.orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_service.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_bundle_option
ON order_service.order_items(bundle_option_id);

CREATE INDEX IF NOT EXISTS idx_order_logs_order_id
ON order_service.order_status_logs(order_id);

-- Payment Service Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id
ON payment_service.payments(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
ON payment_service.payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_status_id
ON payment_service.payments(status_id);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id
ON payment_service.refunds(payment_id);

-- Voucher Service Indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_code
ON voucher_service.vouchers(code);

CREATE INDEX IF NOT EXISTS idx_vouchers_active
ON voucher_service.vouchers(is_active);

CREATE INDEX IF NOT EXISTS idx_voucher_usage_user_id
ON voucher_service.voucher_usages(user_id);

CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id
ON voucher_service.user_vouchers(user_id);

-- Notification Service Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notification_service.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status_id
ON notification_service.notifications(status_id);

-- Afiliate Service Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id
ON affiliate_service.affiliates(user_id);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id
ON affiliate_service.commissions(affiliate_id);

-- Market Analysis Service Indexes
CREATE INDEX IF NOT EXISTS idx_market_products_platform
ON market_analysis_service.market_products(platform);

CREATE INDEX IF NOT EXISTS idx_market_products_keyword
ON market_analysis_service.market_products(keyword);

CREATE INDEX IF NOT EXISTS idx_market_products_crawled_at
ON market_analysis_service.market_products(crawled_at DESC);
