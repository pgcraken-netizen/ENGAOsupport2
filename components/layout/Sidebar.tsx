'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Bell,
  FileText,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'ホーム',    icon: LayoutDashboard },
  { href: '/records',   label: '記録',      icon: ClipboardList },
  { href: '/alerts',    label: 'アラート',  icon: Bell },
  { href: '/patients',  label: '利用者',    icon: Users },
  { href: '/reports',   label: '申し送り',  icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── デスクトップ: 左サイドバー ── */}
      <aside className="hidden md:flex w-52 bg-white border-r border-gray-200 min-h-screen flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-sm font-bold text-engao-green leading-tight">
            えんがお
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">介護記録支援</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-engao-green-light text-engao-green font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">v2.0</p>
        </div>
      </aside>

      {/* ── モバイル: ボトムナビゲーション ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200
                      flex items-stretch safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors min-h-[56px]',
                isActive ? 'text-engao-green' : 'text-gray-400'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
              <span className={cn('font-medium', isActive && 'font-semibold')}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
