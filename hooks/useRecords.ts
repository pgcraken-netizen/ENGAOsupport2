'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CareRecord } from '@/types/record';
import { createClient } from '@/lib/supabase/client';

interface UseRecordsOptions {
  facilityId?: string;
  status?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  autoRefresh?: boolean;
}

export function useRecords(options: UseRecordsOptions = {}) {
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { facilityId, status, patientId, dateFrom, dateTo, limit = 50, autoRefresh } = options;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (facilityId) params.set('facility_id', facilityId);
      if (status) params.set('status', status);
      if (patientId) params.set('patient_id', patientId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/records?${params}`);
      if (!res.ok) throw new Error('取得に失敗しました');
      const data = await res.json();
      setRecords(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [facilityId, status, patientId, dateFrom, dateTo, limit]);

  useEffect(() => {
    fetchRecords();
    if (autoRefresh) {
      const interval = setInterval(fetchRecords, 30_000);
      return () => clearInterval(interval);
    }
  }, [fetchRecords, autoRefresh]);

  const confirmRecord = useCallback(async (id: string, patientId?: string) => {
    await fetch('/api/records/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: id, patient_id: patientId }),
    });
    await fetchRecords();
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (id: string) => {
    // 即座にUIから除去（楽観的更新）
    setRecords(prev => prev.filter(r => r.id !== id));
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        // 失敗したらリフレッシュして元に戻す
        await fetchRecords();
        throw new Error('削除に失敗しました');
      }
    } catch (err) {
      console.error('[deleteRecord]', err);
    }
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords, confirmRecord, deleteRecord };
}
