import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TradeKyaMal — Trading Intelligence Dashboard',
  description: 'Design Thinking 3 — Trading data collection and agent platform',
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
        <main className="ml-60 min-h-screen p-8">{children}</main>
      </body>
    </html>
  );
}
