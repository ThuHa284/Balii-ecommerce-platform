import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import CartDrawer from "@/components/cart/cart-drawer";
import AccountSidebar from "@/components/layout/account-sidebar";
import AuthGuard from "@/components/auth/auth-guard";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard redirectTo="/login">
      <Header />
      <MobileNav />
      <CartDrawer />
      <main className="min-h-screen pt-28 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <AccountSidebar />
            <div className="flex-1">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </AuthGuard>
  );
}
