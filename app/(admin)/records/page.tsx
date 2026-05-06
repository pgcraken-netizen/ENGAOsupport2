'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { RecordTable } from '@/components/admin/RecordTable';
import { RecordCard } from '@/components/admin/RecordCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRecords } from '@/hooks/useRecords';

type StatusFilter = 'all' | 'draft' | 'confirmed';

export default function RecordsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { records, loading, refetch, confirmRecord, deleteRecord } = useRecords({
    status: statusFilter === 'all' ? undefined : statusFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 100,
  });

  const handleConfirm = (id: string) => {
    const record = records.find(r => r.id === id);
    confirmRecord(id, record?.patient_candidates?.[0]?.id);
  };

  const handleDelete = (id: string) => {
    const record = records.find(r => r.id === id);
    const name = record?.patient?.name ?? '記録';
    if (!confirm(`「${name}」の記録を削除しますか？\nこの操作は取り消せません。`)) return;
    deleteRecord(id);
  };

  return (
    <div>
      <TopBar title="記録一覧" />
      <div className="p-6 space-y-4 max-w-5xl">

        {/* フィルターバー */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-1">
                {(['all', 'draft', 'confirmed'] as StatusFilter[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      statusFilter === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'all' ? '全て' : s === 'draft' ? '未確定' : '確定済'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400 text-sm">〜</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>

              <Button size="sm" variant="outline" onClick={refetch}>検索</Button>

              <span className="text-xs text-gray-400 ml-auto">{records.length}件</span>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
        ) : (
          <>
            {/* デスクトップ: テーブル表示 */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-lg p-4">
              <RecordTable records={records} onConfirm={handleConfirm} onDelete={handleDelete} />
            </div>

            {/* モバイル: カード表示 */}
            <div className="md:hidden space-y-3">
              {records.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">記録がありません</div>
              ) : (
                records.map(record => (
                  <RecordCard key={record.id} record={record} onConfirm={handleConfirm} onDelete={handleDelete} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
