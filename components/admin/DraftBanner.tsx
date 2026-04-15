'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraftBannerProps {
  count: number;
  onBulkConfirm?: () => void;
}

export function DraftBanner({ count, onBulkConfirm }: DraftBannerProps) {
  if (count === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
        <span className="text-sm text-orange-800 font-medium">
          未確定の記録が {count} 件あります
        </span>
      </div>
      {onBulkConfirm && (
        <Button size="sm" variant="outline" onClick={onBulkConfirm}
          className="border-orange-300 text-orange-700 hover:bg-orange-100">
          一括確定
        </Button>
      )}
    </div>
  );
}
