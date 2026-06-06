import { UserRole } from '@/types/user.types';

export function canDeleteAdminResource(role?: UserRole | null) {
  return role === UserRole.SUPER_ADMIN;
}

export function canManageAdminResource(role?: UserRole | null) {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}
