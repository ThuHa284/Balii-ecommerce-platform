import { UserRole } from '@/types/user.types';

export function isSuperAdmin(role?: UserRole | null) {
  return role === UserRole.SUPER_ADMIN;
}

export function canDeleteAdminResource(role?: UserRole | null) {
  return isSuperAdmin(role);
}

export function canManageAdminResource(role?: UserRole | null) {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function hasRoleAccess(
  role: UserRole | null | undefined,
  allowedRoles?: UserRole[],
) {
  if (!allowedRoles?.length) {
    return true;
  }

  return !!role && allowedRoles.includes(role);
}

export function getAdminRoleLabel(role?: UserRole | null) {
  if (role === UserRole.SUPER_ADMIN) {
    return 'Quản trị hệ thống';
  }

  if (role === UserRole.ADMIN) {
    return 'Quản trị viên';
  }

  return 'Chưa xác định';
}
