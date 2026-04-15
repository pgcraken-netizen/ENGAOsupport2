import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ENGAO Support 2 - 介護記録支援システム',
  description: '介護現場の記録入力負担を50%削減する支援システム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
