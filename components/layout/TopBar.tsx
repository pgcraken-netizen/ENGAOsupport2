'use client';

import { Bell } from 'lucide-react';

interface TopBarProps {
  title?: string;
  draftCount?: number;
}

export function TopBar({ title = 'えんがおサポート', draftCount = 0 }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200
                       flex items-center justify-between px-4 md:px-6">
      <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
      <div className="flex items-center gap-3">
        {draftCount > 0 && (
          <span className="bg-orange-100 text-orange-700 text-xs font-semibold
                           px-2.5 py-1 rounded-full">
            未確定 {draftCount}件
          </span>
        )}
        <button className="relative p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell className="h-5 w-5" />
          {draftCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
}
