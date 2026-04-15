'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { RecordCard } from '@/components/admin/RecordCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CareRecord } from '@/types/record';

type StatusFilter = 'all' | 'draft' | 'confirmed';

export default function RecordsPage() {
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/records?${params}`);
      const data = await res.json();
      setRecords(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleConfirm = async (id: string) => {
    const record = records.find((r) => r.id === id);
    const patientId = record?.patient_candidates?.[0]?.id ?? null;
    await fetch('/api/records/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: id, patient_id: patientId }),
    });
    fetchRecords();
  };

  return (
    <div>
      <TopBar title="記録一覧" />
      <div className="p-6 space-y-4 max-w-4xl">
        {/* フィルター */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-1">
                {(['all', 'draft', 'confirmed'] as StatusFilter[]).map((s) => (
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
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400">〜</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={fetchRecords}>
                検索
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 記録一覧 */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">読み込み中...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">記録がありません</div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="relative">
                <RecordCard record={record} onConfirm={handleConfirm} />
                <Link
                  href={`/records/${record.id}`}
                  className="absolute top-4 right-4 text-xs text-blue-600 hover:underline"
                >
                  詳細
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
