import type { Metadata } from 'next';
import { Lato, Playfair_Display } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/auth.provider';
import { QueryProvider } from '@/providers/query.provider';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  display: 'swap',
});

const lato = Lato({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Balii Sleepwear - Đồ ngủ lụa cao cấp',
  description:
    'Balii Sleepwear - Thương hiệu đồ ngủ lụa cao cấp giá hợp lý. Chất liệu lụa tự nhiên, thiết kế thanh lịch, mang đến giấc ngủ ngọt ngào.',
  keywords: [
    'đồ ngủ lụa',
    'sleepwear',
    'pyjama lụa',
    'đồ ngủ cao cấp',
    'balii',
  ],
  openGraph: {
    title: 'Balii Sleepwear - Đồ ngủ lụa cao cấp',
    description: 'Thương hiệu đồ ngủ lụa cao cấp giá hợp lý',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${playfair.variable} ${lato.variable}`}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <Toaster
          position="top-right"
          richColors
          expand={false}
          duration={2500}
          toastOptions={{
            classNames: {
              toast: 'balii-toast',
              title: 'balii-toast-title',
              description: 'balii-toast-description',
            },
          }}
        />
      </body>
    </html>
  );
}
