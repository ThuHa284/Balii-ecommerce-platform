-- ============================================================
-- BALII ECOMMERCE PLATFORM - DATABASE INIT SCHEMA
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. user_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS user_service;

CREATE TABLE user_service.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE user_service.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role_id INT REFERENCES user_service.roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_service.oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_service.users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE user_service.provinces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10)
);

CREATE TABLE user_service.districts (
    id SERIAL PRIMARY KEY,
    province_id INT NOT NULL REFERENCES user_service.provinces(id),
    name VARCHAR(100) NOT NULL
);

CREATE TABLE user_service.wards (
    id SERIAL PRIMARY KEY,
    district_id INT NOT NULL REFERENCES user_service.districts(id),
    name VARCHAR(100) NOT NULL
);

CREATE TABLE user_service.user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_service.users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province_id INT NOT NULL REFERENCES user_service.provinces(id),
    district_id INT NOT NULL REFERENCES user_service.districts(id),
    ward_id INT NOT NULL REFERENCES user_service.wards(id),
    street_address VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE user_service.email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_service.users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);

CREATE TABLE user_service.password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_service.users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);

-- ============================================================
-- 2. product_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS product_service;

CREATE TABLE product_service.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES product_service.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE product_service.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES product_service.categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(280) UNIQUE NOT NULL,
    description TEXT,
    base_price NUMERIC(12,2) NOT NULL,
    original_price NUMERIC(12,2),
    sale_price NUMERIC(12,2),
    sale_start_at TIMESTAMPTZ,
    sale_end_at TIMESTAMPTZ,
    material VARCHAR(100),
    target_gender VARCHAR(20) DEFAULT 'unisex',
    recommended_age_groups TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    es_sync_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_service.attributes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE product_service.attribute_values (
    id SERIAL PRIMARY KEY,
    attribute_id INT NOT NULL REFERENCES product_service.attributes(id) ON DELETE CASCADE,
    value VARCHAR(50) NOT NULL,
    display_order INT DEFAULT 0
);

CREATE TABLE product_service.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES product_service.products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price NUMERIC(12,2),
    stock_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    weight_gram INT,
    is_active BOOLEAN DEFAULT TRUE,
    es_sync_status BOOLEAN DEFAULT FALSE,
    item_type VARCHAR(20) NOT NULL DEFAULT 'TOP',
    size_label VARCHAR(50),
    color_name VARCHAR(50),
    CONSTRAINT chk_product_variant_item_type
        CHECK (item_type IN ('TOP', 'BOTTOM', 'SET'))
);

CREATE TABLE product_service.variant_attribute_values (
    variant_id UUID NOT NULL REFERENCES product_service.product_variants(id) ON DELETE CASCADE,
    attribute_value_id INT NOT NULL REFERENCES product_service.attribute_values(id) ON DELETE CASCADE,
    PRIMARY KEY (variant_id, attribute_value_id)
);

CREATE TABLE product_service.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES product_service.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_service.product_variants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    public_id TEXT,
    alt_text VARCHAR(255),
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE
);

CREATE TABLE product_service.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES product_service.products(id),
    user_id UUID NOT NULL,
    order_item_id UUID,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(150),
    body TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_service.flash_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE product_service.flash_sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flash_sale_id UUID NOT NULL REFERENCES product_service.flash_sales(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_service.product_variants(id),
    sale_price NUMERIC(12,2) NOT NULL,
    stock_limit INT,
    sold_count INT DEFAULT 0,
    UNIQUE (flash_sale_id, variant_id)
);

CREATE TABLE product_service.bundle_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES product_service.products(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    top_quantity INT NOT NULL DEFAULT 0,
    bottom_quantity INT NOT NULL DEFAULT 0,
    original_price NUMERIC(12,2) NOT NULL,
    sale_price NUMERIC(12,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_service.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    description TEXT,
    short_description TEXT,
    image_url TEXT,
    banner_image_url TEXT,
    product_ids UUID[] NOT NULL DEFAULT '{}',
    season VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_service.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    description TEXT,
    short_description TEXT,
    image_url TEXT,
    banner_image_url TEXT,
    product_ids UUID[] NOT NULL DEFAULT '{}',
    discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENT',
    discount_value NUMERIC(12,2),
    gift_name VARCHAR(255),
    gift_description TEXT,
    badge_text VARCHAR(120),
    priority_order INT NOT NULL DEFAULT 0,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. order_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS order_service;

CREATE TABLE order_service.outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_service.order_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    is_terminal BOOLEAN DEFAULT FALSE
);

CREATE TABLE order_service.shipping_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_fee NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE order_service.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    order_code VARCHAR(30) UNIQUE NOT NULL,
    status_id INT NOT NULL REFERENCES order_service.order_statuses(id),
    shipping_address JSONB NOT NULL,
    voucher_id UUID,
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(12,2) DEFAULT 0,
    shipping_fee NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    note TEXT,
    shipping_method_id INT REFERENCES order_service.shipping_methods(id),
    camunda_process_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_service.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES order_service.orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    variant_label VARCHAR(200),
    campaign_id UUID,
    campaign_name VARCHAR(255),
    campaign_discount_type VARCHAR(20),
    campaign_discount_value NUMERIC(12,2),
    campaign_badge_text VARCHAR(120),
    unit_price NUMERIC(12,2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12,2) NOT NULL,
    thumbnail_url TEXT,
    bundle_option_id UUID,
    selected_items JSONB
);

CREATE TABLE order_service.order_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES order_service.orders(id) ON DELETE CASCADE,
    from_status_id INT REFERENCES order_service.order_statuses(id),
    to_status_id INT NOT NULL REFERENCES order_service.order_statuses(id),
    changed_by UUID,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_service.shipping_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES order_service.orders(id) ON DELETE CASCADE UNIQUE,
    carrier VARCHAR(100),
    tracking_code VARCHAR(100),
    estimated_delivery DATE,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- ============================================================
-- 4. payment_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS payment_service;

CREATE TABLE payment_service.outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_service.payment_providers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE payment_service.payment_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    label VARCHAR(80) NOT NULL
);

CREATE TABLE payment_service.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider_id INT NOT NULL REFERENCES payment_service.payment_providers(id),
    status_id INT NOT NULL REFERENCES payment_service.payment_statuses(id),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'VND',
    provider_txn_id VARCHAR(200),
    provider_ref VARCHAR(200),
    payment_url TEXT,
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_service.payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payment_service.payments(id),
    raw_payload JSONB NOT NULL,
    signature_valid BOOLEAN,
    processed_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_service.refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payment_service.payments(id),
    amount NUMERIC(12,2) NOT NULL,
    status_id INT NOT NULL REFERENCES payment_service.payment_statuses(id),
    reason TEXT,
    provider_refund_id VARCHAR(200),
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. voucher_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS voucher_service;

CREATE TABLE voucher_service.voucher_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    label VARCHAR(80) NOT NULL
);

CREATE TABLE voucher_service.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    type_id INT NOT NULL REFERENCES voucher_service.voucher_types(id),
    discount_value NUMERIC(12,2) NOT NULL,
    max_discount_amount NUMERIC(12,2),
    min_order_amount NUMERIC(12,2) DEFAULT 0,
    usage_limit INT,
    used_count INT DEFAULT 0,
    user_limit_per_user INT DEFAULT 1,
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE voucher_service.voucher_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES voucher_service.vouchers(id),
    user_id UUID NOT NULL,
    order_id UUID NOT NULL,
    discount_applied NUMERIC(12,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE voucher_service.user_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES voucher_service.vouchers(id),
    user_id UUID NOT NULL,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (voucher_id, user_id)
);

-- ============================================================
-- 6. notification_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS notification_service;

CREATE TABLE notification_service.notification_channels (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    label VARCHAR(80) NOT NULL
);

CREATE TABLE notification_service.notification_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    template_key VARCHAR(100) NOT NULL,
    default_title VARCHAR(255)
);

CREATE TABLE notification_service.notification_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE notification_service.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    channel_id INT NOT NULL REFERENCES notification_service.notification_channels(id),
    type_id INT NOT NULL REFERENCES notification_service.notification_types(id),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    metadata JSONB,
    status_id INT NOT NULL REFERENCES notification_service.notification_statuses(id),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. affiliate_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS affiliate_service;

CREATE TABLE affiliate_service.affiliate_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE affiliate_service.affiliates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    referral_code VARCHAR(30) UNIQUE NOT NULL,
    status_id INT NOT NULL REFERENCES affiliate_service.affiliate_statuses(id),
    commission_rate NUMERIC(5,4) NOT NULL,
    total_earned NUMERIC(14,2) DEFAULT 0,
    total_paid NUMERIC(14,2) DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_service.referral_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES affiliate_service.affiliates(id),
    ip_address INET,
    user_agent TEXT,
    converted BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_service.commission_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE affiliate_service.commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES affiliate_service.affiliates(id),
    order_id UUID NOT NULL,
    order_amount NUMERIC(12,2) NOT NULL,
    commission_rate NUMERIC(5,4) NOT NULL,
    commission_amount NUMERIC(12,2) NOT NULL,
    status_id INT NOT NULL REFERENCES affiliate_service.commission_statuses(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- ============================================================
-- 8. market_analysis_service
-- ============================================================
CREATE SCHEMA IF NOT EXISTS market_analysis_service;

CREATE TABLE market_analysis_service.market_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    keyword VARCHAR(255),
    name TEXT NOT NULL,
    price NUMERIC(12,2),
    original_price NUMERIC(12,2),
    sold_count INT,
    rating NUMERIC(3,2),
    shop_name VARCHAR(255),
    image_url TEXT,
    product_url TEXT,
    raw_data JSONB,
    crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
ON product_service.products
USING gin (name gin_trgm_ops);
