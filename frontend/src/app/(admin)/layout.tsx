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
      <div className="flex min-h-screen items-start">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-6 pt-20 lg:p-8">
          {children}
        </main>
      </div>
      <CommandPalette />
    </AuthGuard>
  );
}
