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

CREATE INDEX idx_market_products_platform
ON market_analysis_service.market_products(platform);

CREATE INDEX idx_market_products_keyword
ON market_analysis_service.market_products(keyword);