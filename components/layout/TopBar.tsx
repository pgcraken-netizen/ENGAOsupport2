'use client';

import { Bell } from 'lucide-react';

interface TopBarProps {
  title?: string;
  draftCount?: number;
}

export function TopBar({ title = 'ENGAO Support 2', draftCount = 0 }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <div className="flex items-center gap-4">
        {draftCount > 0 && (
          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
            未確定 {draftCount}件
          </span>
        )}
        <button className="relative p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
