'use client';

import { useEffect, useState, useCallback } from 'react';
import { CareRecord } from '@/types/record';

export function useDrafts(facilityId?: string) {
  const [drafts, setDrafts] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set('facility_id', facilityId);
      const res = await fetch(`/api/records/drafts?${params}`);
      if (!res.ok) throw new Error('取得に失敗しました');
      const data = await res.json();
      setDrafts(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchDrafts();
    const interval = setInterval(fetchDrafts, 20_000);
    return () => clearInterval(interval);
  }, [fetchDrafts]);

  const confirmOne = useCallback(async (id: string, patientId?: string) => {
    await fetch('/api/records/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: id, patient_id: patientId }),
    });
    await fetchDrafts();
  }, [fetchDrafts]);

  const confirmAll = useCallback(async () => {
    if (drafts.length === 0) return;
    await fetch('/api/records/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_ids: drafts.map((d) => d.id) }),
    });
    await fetchDrafts();
  }, [drafts, fetchDrafts]);

  const deleteOne = useCallback(async (id: string) => {
    setDrafts(prev => prev.filter(r => r.id !== id));
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      if (!res.ok) await fetchDrafts();
    } catch {
      await fetchDrafts();
    }
  }, [fetchDrafts]);

  return {
    drafts,
    loading,
    error,
    count: drafts.length,
    refetch: fetchDrafts,
    confirmOne,
    confirmAll,
    deleteOne,
  };
}
