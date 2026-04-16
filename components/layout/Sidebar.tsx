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
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/records', label: '記録一覧', icon: ClipboardList },
  { href: '/patients', label: '利用者', icon: Users },
  { href: '/alerts', label: 'アラート', icon: Bell },
  { href: '/reports', label: '申し送り', icon: FileText },
  { href: '/staff', label: 'スタッフ', icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-sm font-bold text-blue-700 leading-tight">
          ENGAO
          <br />
          Support 2
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">介護記録支援</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">v1.0.0</p>
      </div>
    </aside>
  );
}
