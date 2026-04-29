import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'えんがお 記録',
  description: 'えんがお スタッフ記録アプリ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100dvh' }}>
      {children}
    </div>
  );
}
