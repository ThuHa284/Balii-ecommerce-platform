import AdminSidebar from '@/components/layout/admin-sidebar';
import AuthGuard from '@/components/auth/auth-guard';
import { UserRole } from '@/types/user.types';
import CommandPalette from '@/components/admin/command-palette';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}
      redirectTo="/login"
    >
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
      <CommandPalette />
    </AuthGuard>
  );
}
