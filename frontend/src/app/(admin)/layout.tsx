import AdminSidebar from "@/components/layout/admin-sidebar";
import AuthGuard from "@/components/auth/auth-guard";
import { UserRole } from "@/types/user.types";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole={UserRole.ADMIN} redirectTo="/login">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
