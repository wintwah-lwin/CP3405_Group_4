import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TradeKyaMal — Weekly Market Intelligence',
  description: 'Multi-agent trading intelligence platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Sidebar />
        <main className="relative ml-60 min-h-screen">
          <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
