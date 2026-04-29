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
  UserCog,
  Smartphone,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/records', label: '記録一覧', icon: ClipboardList },
  { href: '/patients', label: '利用者', icon: Users },
  { href: '/alerts', label: 'アラート', icon: Bell },
  { href: '/reports', label: '帳票・申し送り', icon: FileText },
  { href: '/staff', label: 'スタッフ', icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-engao-border min-h-screen flex flex-col">
      <div className="p-4 border-b border-engao-border bg-engao-green">
        <h1 className="text-base font-bold text-white leading-tight">
          えんがお
        </h1>
        <p className="text-xs text-white/70 mt-0.5">管理画面</p>
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
                  ? 'bg-engao-green-light text-engao-green-dark font-medium'
                  : 'text-engao-sub hover:bg-engao-bg hover:text-engao-text'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-engao-border">
        <a
          href="/liff"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-engao-sub hover:bg-engao-bg transition-colors"
        >
          <Smartphone className="h-3.5 w-3.5 flex-shrink-0" />
          スタッフ入力画面
        </a>
        <p className="text-xs text-engao-sub/50 px-3 mt-1">v2.0.0</p>
      </div>
    </aside>
  );
}
