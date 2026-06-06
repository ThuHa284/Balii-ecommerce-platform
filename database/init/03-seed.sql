-- ============================================================
-- USER ROLES
-- ============================================================

INSERT INTO user_service.roles (id, name, description)
VALUES
    (1, 'SUPER_ADMIN', 'Quản trị hệ thống cấp cao'),
    (2, 'ADMIN', 'Quản trị viên'),
    (3, 'CUSTOMER', 'Khách hàng')
ON CONFLICT (name) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('user_service.roles', 'id'),
    COALESCE((SELECT MAX(id) FROM user_service.roles), 1),
    TRUE
);

-- ============================================================
-- ADMIN ACCOUNTS
-- Password plain: 123456
-- ============================================================

INSERT INTO user_service.users (
    id,
    email,
    password_hash,
    full_name,
    phone,
    role_id,
    is_active,
    email_verified_at
)
VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'superadmin@balii.com',
    '$2b$10$peQN3vPtb.0jcGqI3.up7erjwWNLpzu4xJkIsavdR6HBnzyE8GtKq',
    'Super Admin',
    '0900000001',
    1,
    TRUE,
    NOW()
),
(
    '22222222-2222-4222-8222-222222222222',
    'admin@balii.com',
    '$2b$10$peQN3vPtb.0jcGqI3.up7erjwWNLpzu4xJkIsavdR6HBnzyE8GtKq',
    'Admin Balii',
    '0900000002',
    2,
    TRUE,
    NOW()
),
(
    '33333333-3333-4333-8333-333333333333',
    'customer@balii.com',
    '$2b$10$peQN3vPtb.0jcGqI3.up7erjwWNLpzu4xJkIsavdR6HBnzyE8GtKq',
    'Demo Customer',
    '0900000003',
    3,
    TRUE,
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- USER ADDRESSES LOOKUP - 34 tỉnh/thành Việt Nam sau sáp nhập
-- ============================================================

INSERT INTO user_service.provinces (id, name, code)
VALUES
    (1, 'Thành phố Hà Nội', 'HNI'),
    (2, 'Thành phố Hải Phòng', 'HPG'),
    (3, 'Thành phố Huế', 'HUE'),
    (4, 'Thành phố Đà Nẵng', 'DNG'),
    (5, 'Thành phố Hồ Chí Minh', 'HCM'),
    (6, 'Thành phố Cần Thơ', 'CTO'),
    (7, 'Tỉnh Tuyên Quang', 'TQG'),
    (8, 'Tỉnh Lào Cai', 'LCI'),
    (9, 'Tỉnh Thái Nguyên', 'TNG'),
    (10, 'Tỉnh Phú Thọ', 'PTO'),
    (11, 'Tỉnh Bắc Ninh', 'BNH'),
    (12, 'Tỉnh Hưng Yên', 'HYN'),
    (13, 'Tỉnh Ninh Bình', 'NBH'),
    (14, 'Tỉnh Thanh Hóa', 'THA'),
    (15, 'Tỉnh Nghệ An', 'NAN'),
    (16, 'Tỉnh Hà Tĩnh', 'HTH'),
    (17, 'Tỉnh Quảng Trị', 'QTI'),
    (18, 'Tỉnh Quảng Ngãi', 'QNI'),
    (19, 'Tỉnh Gia Lai', 'GLI'),
    (20, 'Tỉnh Khánh Hòa', 'KHA'),
    (21, 'Tỉnh Lâm Đồng', 'LDG'),
    (22, 'Tỉnh Đắk Lắk', 'DLK'),
    (23, 'Tỉnh Đồng Nai', 'DNI'),
    (24, 'Tỉnh Tây Ninh', 'TNI'),
    (25, 'Tỉnh Đồng Tháp', 'DTP'),
    (26, 'Tỉnh Vĩnh Long', 'VLG'),
    (27, 'Tỉnh An Giang', 'AGG'),
    (28, 'Tỉnh Cà Mau', 'CMU'),
    (29, 'Tỉnh Lai Châu', 'LCH'),
    (30, 'Tỉnh Điện Biên', 'DBN'),
    (31, 'Tỉnh Sơn La', 'SLA'),
    (32, 'Tỉnh Lạng Sơn', 'LSN'),
    (33, 'Tỉnh Quảng Ninh', 'QNH'),
    (34, 'Tỉnh Cao Bằng', 'CBG')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    code = EXCLUDED.code;

-- Vì schema hiện tại vẫn bắt buộc district_id và ward_id,
-- giữ dữ liệu mẫu để user_address không lỗi khóa ngoại.
INSERT INTO user_service.districts (id, province_id, name)
VALUES
    (1, 5, 'Quận 1')
ON CONFLICT (id) DO UPDATE
SET province_id = EXCLUDED.province_id,
    name = EXCLUDED.name;

INSERT INTO user_service.wards (id, district_id, name)
VALUES
    (1, 1, 'Phường Bến Nghé')
ON CONFLICT (id) DO UPDATE
SET district_id = EXCLUDED.district_id,
    name = EXCLUDED.name;

SELECT setval(pg_get_serial_sequence('user_service.provinces', 'id'), 34, TRUE);
SELECT setval(pg_get_serial_sequence('user_service.districts', 'id'), COALESCE((SELECT MAX(id) FROM user_service.districts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('user_service.wards', 'id'), COALESCE((SELECT MAX(id) FROM user_service.wards), 1), TRUE);

INSERT INTO user_service.user_addresses (
    id,
    user_id,
    recipient_name,
    phone,
    province_id,
    district_id,
    ward_id,
    street_address,
    is_default
)
VALUES
(
    '44444444-4444-4444-8444-444444444444',
    '33333333-3333-4333-8333-333333333333',
    'Demo Customer',
    '0900000003',
    1,
    1,
    1,
    '12 Nguyễn Huệ',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

INSERT INTO product_service.categories (id, name, slug, image_url, sort_order, is_active)
VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Bộ đồ ngủ', 'bo-do-ngu', 'https://placehold.co/800x1000/png?text=Bo+Do+Ngu', 1, TRUE),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Pijama', 'pijama', 'https://placehold.co/800x1000/png?text=Pijama', 2, TRUE),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Áo choàng', 'ao-choang', 'https://placehold.co/800x1000/png?text=Ao+Choang', 3, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_service.attributes (id, name)
VALUES
    (1, 'Size'),
    (2, 'Color')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_service.attribute_values (id, attribute_id, value, display_order)
VALUES
    (1, 1, 'S', 1),
    (2, 1, 'M', 2),
    (3, 1, 'L', 3),
    (11, 2, 'Hồng pastel', 1),
    (12, 2, 'Trắng ngà', 2),
    (13, 2, 'Tím lavender', 3),
    (14, 2, 'Xanh mint', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('product_service.attributes', 'id'),
    COALESCE((SELECT MAX(id) FROM product_service.attributes), 1),
    TRUE
);
SELECT setval(
    pg_get_serial_sequence('product_service.attribute_values', 'id'),
    COALESCE((SELECT MAX(id) FROM product_service.attribute_values), 1),
    TRUE
);

INSERT INTO product_service.products (
    id,
    category_id,
    name,
    slug,
    description,
    base_price,
    original_price,
    sale_price,
    material,
    is_active,
    es_sync_status
)
VALUES
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Bộ đồ ngủ lụa satin hồng pastel',
    'bo-do-ngu-lua-satin-hong-pastel',
    'Bộ đồ ngủ vải lụa satin mềm, thoáng va phù hợp sử dụng hằng ngày.',
    890000,
    890000,
    690000,
    'Lụa satin',
    TRUE,
    FALSE
),
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Pijama cotton trắng ngà',
    'pijama-cotton-trang-nga',
    'Pijama cotton nhẹ, thoáng và dễ giặt.',
    950000,
    950000,
    NULL,
    'Cotton',
    TRUE,
    FALSE
),
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'Áo choàng lụa tím lavender',
    'ao-choang-lua-tim-lavender',
    'Áo choàng lụa cho phòng ngủ và resort.',
    1200000,
    1200000,
    980000,
    'Lụa',
    TRUE,
    FALSE
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_service.product_variants (
    id,
    product_id,
    sku,
    price,
    stock_quantity,
    reserved_quantity,
    weight_gram,
    is_active,
    es_sync_status,
    item_type,
    size_label,
    color_name
)
VALUES
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'BDN-HP-S', 890000, 15, 0, 300, TRUE, FALSE, 'SET', 'S', 'Hồng pastel'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'BDN-HP-M', 890000, 20, 0, 320, TRUE, FALSE, 'SET', 'M', 'Hồng pastel'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'PJ-TN-S', 950000, 12, 0, 280, TRUE, FALSE, 'SET', 'S', 'Trắng ngà'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'PJ-TN-M', 950000, 18, 0, 300, TRUE, FALSE, 'SET', 'M', 'Trắng ngà'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'AC-TL-M', 1200000, 7, 0, 350, TRUE, FALSE, 'TOP', 'M', 'Tím lavender'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc006', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'AC-TL-L', 1200000, 5, 0, 360, TRUE, FALSE, 'TOP', 'L', 'Tím lavender')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO product_service.variant_attribute_values (variant_id, attribute_value_id)
VALUES
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc001', 1),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc001', 11),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc002', 2),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc002', 11),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc003', 1),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc003', 12),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc004', 2),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc004', 12),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc005', 2),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc005', 13),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc006', 3),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccc006', 13)
ON CONFLICT DO NOTHING;

INSERT INTO product_service.product_images (
    id,
    product_id,
    variant_id,
    url,
    public_id,
    alt_text,
    sort_order,
    is_primary
)
VALUES
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', NULL, 'https://placehold.co/800x1000/png?text=Hong+Pastel+1', 'seed/balii/product-1-main', 'Bộ đồ ngủ hồng pastel', 1, TRUE),
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'cccccccc-cccc-4ccc-8ccc-ccccccccc001', 'https://placehold.co/800x1000/png?text=Hong+Pastel+S', 'seed/balii/product-1-s', 'Bộ đồ ngủ hồng pastel size S', 2, FALSE),
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', NULL, 'https://placehold.co/800x1000/png?text=Trang+Nga+1', 'seed/balii/product-2-main', 'Bộ pijama trang nga', 1, TRUE),
    ('dddddddd-dddd-4ddd-8ddd-ddddddddd004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', NULL, 'https://placehold.co/800x1000/png?text=Tim+Lavender+1', 'seed/balii/product-3-main', 'Bộ áo choàng tím lavender', 1, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_service.bundle_options (
    id,
    product_id,
    name,
    top_quantity,
    bottom_quantity,
    original_price,
    sale_price,
    is_active
)
VALUES
    ('eeeeeeee-eeee-4eee-8eee-eeeeeeeee001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'Set 1 ao + 1 quan', 1, 1, 890000, 690000, TRUE),
    ('eeeeeeee-eeee-4eee-8eee-eeeeeeeee002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'Set pijama cotton', 1, 1, 950000, 850000, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_service.collections (
    id,
    name,
    slug,
    description,
    short_description,
    image_url,
    banner_image_url,
    product_ids,
    season,
    is_active
)
VALUES
    (
        'ffffffff-ffff-4fff-8fff-fffffffff001',
        'Summer Silk 2026',
        'summer-silk-2026',
        'Bo suu tap lua mua he voi cac thiet ke nhe, thoang va phu hop mac hang ngay.',
        'Chat lua mong nhe cho mua he.',
        'https://placehold.co/1200x800/png?text=Summer+Silk+2026',
        'https://placehold.co/1600x900/png?text=Summer+Silk+2026+Banner',
        ARRAY[
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001'::uuid,
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002'::uuid
        ],
        'Summer 2026',
        TRUE
    ),
    (
        'ffffffff-ffff-4fff-8fff-fffffffff002',
        'Lavender Nights',
        'lavender-nights',
        'Nhom san pham tong tim lavender danh cho khong gian nghi ngoi va resort.',
        'Sac tim lavender cho nhung dem thu thai.',
        'https://placehold.co/1200x800/png?text=Lavender+Nights',
        'https://placehold.co/1600x900/png?text=Lavender+Nights+Banner',
        ARRAY[
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003'::uuid
        ],
        'Resort 2026',
        TRUE
    )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ORDER AND PAYMENT LOOKUPS
-- ============================================================

INSERT INTO order_service.order_statuses (id, code, label, is_terminal)
VALUES
    (1, 'pending', 'Chờ xử lý', FALSE),
    (2, 'confirmed', 'Đã xác nhận', FALSE),
    (3, 'processing', 'Đang xử lý', FALSE),
    (4, 'shipping', 'Đang giao', FALSE),
    (5, 'delivered', 'Đã giao', TRUE),
    (6, 'cancelled', 'Đã hủy', TRUE),
    (7, 'refunded', 'Đã hoàn tiền', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO order_service.shipping_methods (id, name, base_fee, is_active)
VALUES
    (1, 'Giao hàng tiêu chuẩn', 30000, TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('order_service.order_statuses', 'id'),
    COALESCE((SELECT MAX(id) FROM order_service.order_statuses), 1),
    TRUE
);
SELECT setval(
    pg_get_serial_sequence('order_service.shipping_methods', 'id'),
    COALESCE((SELECT MAX(id) FROM order_service.shipping_methods), 1),
    TRUE
);

INSERT INTO payment_service.payment_providers (id, code, name, is_active)
VALUES
    (1, 'cod', 'Thanh toán khi nhận hàng', TRUE),
    (2, 'bank_transfer', 'Chuyển khoản ngân hàng', TRUE),
    (3, 'mock_online', 'ổng thanh toán mô phỏng', TRUE),
    (4, 'vnpay', 'VNPay', TRUE),
    (5, 'momo', 'MoMo', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO payment_service.payment_statuses (id, code, label)
VALUES
    (1, 'pending', 'Chờ thanh toán'),
    (2, 'paid', 'Đã thanh toán'),
    (3, 'failed', 'Thanh toán thất bại'),
    (4, 'refunded', 'Đã hoàn tiền')
ON CONFLICT (code) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('payment_service.payment_providers', 'id'),
    COALESCE((SELECT MAX(id) FROM payment_service.payment_providers), 1),
    TRUE
);
SELECT setval(
    pg_get_serial_sequence('payment_service.payment_statuses', 'id'),
    COALESCE((SELECT MAX(id) FROM payment_service.payment_statuses), 1),
    TRUE
);

-- ============================================================
-- MARKET ANALYSIS SAMPLE DATA
-- ============================================================

INSERT INTO market_analysis_service.market_products (
    id,
    platform,
    external_id,
    keyword,
    name,
    price,
    original_price,
    sold_count,
    rating,
    shop_name,
    image_url,
    product_url,
    raw_data
)
VALUES
    (
        '99999999-9999-4999-8999-999999999001',
        'shopee',
        'SP-001',
        'do ngu lua nu',
        'Bo ngu lua satin hong pastel',
        690000,
        890000,
        128,
        4.8,
        'Balii Official',
        'https://placehold.co/600x600/png?text=Market+Product+1',
        'https://example.com/shopee/bdn-hong-pastel',
        '{"source":"seed","platform":"shopee"}'::jsonb
    ),
    (
        '99999999-9999-4999-8999-999999999002',
        'tiktok_shop',
        'TK-001',
        'pijama cotton nu',
        'Pijama cotton trang nga',
        950000,
        950000,
        54,
        4.7,
        'Balii Social Commerce',
        'https://placehold.co/600x600/png?text=Market+Product+2',
        'https://example.com/tiktok/pijama-cotton-trang-nga',
        '{"source":"seed","platform":"tiktok_shop"}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;
