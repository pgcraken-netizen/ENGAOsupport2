'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';

interface TopBarProps {
  title?: string;
  draftCount?: number;
}

export function TopBar({ title = 'えんがお 管理', draftCount = 0 }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-engao-border flex items-center justify-between px-6">
      <h2 className="font-semibold text-engao-text">{title}</h2>
      <div className="flex items-center gap-3">
        {draftCount > 0 && (
          <span className="bg-engao-orange-light text-engao-warn text-xs font-medium px-2.5 py-1 rounded-full">
            未確定 {draftCount}件
          </span>
        )}
        <Link href="/alerts" className="relative p-1.5 rounded-lg hover:bg-engao-bg text-engao-sub transition-colors">
          <Bell className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
