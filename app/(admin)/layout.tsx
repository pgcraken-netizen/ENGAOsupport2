import { Sidebar } from '@/components/layout/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-engao-bg overflow-hidden">
      <Sidebar />
      {/* モバイルではボトムナビ分(56px)の余白が必要 */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
