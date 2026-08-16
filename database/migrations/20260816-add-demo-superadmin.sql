-- Tài khoản Google dùng để kiểm thử quyền superadmin và email thông báo đơn hàng.
-- password_hash để NULL: người dùng đăng nhập bằng Google, OAuth account sẽ được
-- liên kết với bản ghi này trong lần đăng nhập đầu tiên.
INSERT INTO user_service.users (
  id,
  email,
  password_hash,
  full_name,
  role_id,
  is_active,
  email_verified_at
)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  'nguyenvoanhduy5@gmail.com',
  NULL,
  'Nguyễn Võ Anh Duy',
  (SELECT id FROM user_service.roles WHERE name = 'SUPER_ADMIN'),
  TRUE,
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET role_id = (SELECT id FROM user_service.roles WHERE name = 'SUPER_ADMIN'),
    is_active = TRUE,
    email_verified_at = COALESCE(
      user_service.users.email_verified_at,
      EXCLUDED.email_verified_at
    ),
    updated_at = NOW();
