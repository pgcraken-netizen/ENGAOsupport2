// スタッフ入力専用レイアウト（サイドバーなし・モバイルファースト）
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-engao-bg">
      {children}
    </div>
  );
}
