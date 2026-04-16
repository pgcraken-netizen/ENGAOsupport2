'use client';

import { useState } from 'react';
import { CareRecord } from '@/types/record';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle } from 'lucide-react';

interface BulkConfirmModalProps {
  drafts: CareRecord[];
  onConfirm: (ids: string[]) => Promise<void>;
  onClose: () => void;
}

export function BulkConfirmModal({ drafts, onConfirm, onClose }: BulkConfirmModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(drafts.map((d) => d.id))
  );
  const [loading, setLoading] = useState(false);

  const toggleRecord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      await onConfirm(Array.from(selectedIds));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // 利用者未確定の記録を抽出
  const unidentified = drafts.filter(
    (d) =>
      selectedIds.has(d.id) &&
      !d.patient_id &&
      !(d.patient_candidates as Array<unknown>)?.length
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">一括確定</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 警告 */}
        {unidentified.length > 0 && (
          <div className="mx-5 mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              {unidentified.length} 件の記録は利用者が未特定です。確定後も修正可能です。
            </p>
          </div>
        )}

        {/* 記録リスト */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {drafts.map((draft) => {
            const isSelected = selectedIds.has(draft.id);
            const patientName =
              draft.patient?.name ??
              (draft.patient_candidates as Array<{ name: string }>)?.[0]?.name ??
              '利用者未特定';

            return (
              <label
                key={draft.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRecord(draft.id)}
                  className="mt-0.5 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{patientName}</span>
                    {draft.condition && (
                      <Badge variant={draft.condition === '良好' ? 'success' : 'secondary'}>
                        {draft.condition}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{draft.original_text}</p>
                  {draft.care_tags.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">{draft.care_tags.join('・')}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* フッター */}
        <div className="p-5 border-t flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">
            {selectedIds.size} / {drafts.length} 件を選択中
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              キャンセル
            </Button>
            <Button onClick={handleConfirm} disabled={loading || selectedIds.size === 0}>
              {loading ? '処理中...' : `${selectedIds.size}件を確定`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
