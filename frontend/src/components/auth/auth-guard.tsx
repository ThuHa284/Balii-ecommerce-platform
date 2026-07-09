'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/user.types';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  /** If provided, checks that the user has this role. Unauthorized users are redirected. */
  requiredRole?: UserRole;
  /** If provided, accepts any role in the list. */
  allowedRoles?: UserRole[];
  /** Where to redirect unauthenticated users. Defaults to /login */
  redirectTo?: string;
}

/**
 * Client-side route protection component.
 * Wraps protected pages to ensure the user is authenticated (and optionally has the right role).
 */
export default function AuthGuard({
  children,
  requiredRole,
  allowedRoles,
  redirectTo = '/login',
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Don't redirect while the store is hydrating
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    // Role check — if admin route is accessed by a non-admin, send them home
    const hasRoleAccess = requiredRole
      ? user?.role === requiredRole
      : allowedRoles
        ? !!user?.role && allowedRoles.includes(user.role)
        : true;

    if (!hasRoleAccess) {
      router.replace(
        user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
          ? '/admin/dashboard'
          : '/',
      );
    }
  }, [
    allowedRoles,
    isAuthenticated,
    isLoading,
    isMounted,
    requiredRole,
    redirectTo,
    router,
    user?.role,
  ]);

  // Render a stable fallback until the client has mounted to avoid SSR/client mismatch.
  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Don't render children until authentication is confirmed
  if (!isAuthenticated) return null;
  const hasRoleAccess = requiredRole
    ? user?.role === requiredRole
    : allowedRoles
      ? !!user?.role && allowedRoles.includes(user.role)
      : true;

  if (!hasRoleAccess) return null;

  return <>{children}</>;
}
