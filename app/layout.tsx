import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'えんがお 記録システム',
  description: 'グループホームえんがお スタッフ記録・管理システム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased" style={{ background: '#FAFAF7', color: '#333333' }}>
        {children}
      </body>
    </html>
  );
}
