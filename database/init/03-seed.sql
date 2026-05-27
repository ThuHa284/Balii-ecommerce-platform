-- ============================================================
-- USER ROLES
-- ============================================================

INSERT INTO user_service.roles (id, name, description)
VALUES
    (1, 'SUPER_ADMIN', 'Quản trị hệ thống cấp cao'),
    (2, 'ADMIN', 'Quản trị viên'),
    (3, 'CUSTOMER', 'Khách hàng')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- ADMIN ACCOUNTS
-- Password plain: 123456           
-- bcrypt hash rounds 10
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
    uuid_generate_v4(),
    'superadmin@balii.com',
    '$2b$10$8w1Z0P7Q9M2K2Hn5QmM5UuQ0L7fQ8R6W7uK2eM3gY9X5zA8N1mD7K',
    'Super Admin',
    '0900000001',
    1,
    TRUE,
    NOW()
),
(
    uuid_generate_v4(),
    'admin@balii.com',
    '$2b$10$8w1Z0P7Q9M2K2Hn5QmM5UuQ0L7fQ8R6W7uK2eM3gY9X5zA8N1mD7K',
    'Admin Balii',
    '0900000002',
    2,
    TRUE,
    NOW()
),
(
    uuid_generate_v4(),
    'customer@balii.com',
    '$2b$10$8w1Z0P7Q9M2K2Hn5QmM5UuQ0L7fQ8R6W7uK2eM3gY9X5zA8N1mD7K',
    'Demo Customer',
    '0900000003',
    3,
    TRUE,
    NOW()
)
ON CONFLICT (email) DO NOTHING;