import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import CartDrawer from "@/components/cart/cart-drawer";
import ChatWidget from "@/components/ai/chat-widget";
import { FloatingPromoBar } from "@/components/product/promo-notification";
import QuickViewModal from "@/components/product/quick-view-modal";
import FloatingCompareBar from "@/components/product/compare-bar";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <MobileNav />
      <CartDrawer />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <ChatWidget />
      <FloatingPromoBar />
      <QuickViewModal />
      <FloatingCompareBar />
    </>
  );
}


