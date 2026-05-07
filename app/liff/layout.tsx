// LIFF専用レイアウト: 管理UIなし、モバイル最適化
export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif' }}>
      {children}
    </div>
  );
}
