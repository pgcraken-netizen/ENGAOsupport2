'use client';

import { useEffect, useState, useCallback } from 'react';
import { Alert } from '@/types/alert';

export function useAlerts(facilityId?: string, showResolved = false) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set('facility_id', facilityId);
      if (!showResolved) params.set('is_resolved', 'false');
      const res = await fetch(`/api/alerts?${params}`);
      if (!res.ok) throw new Error('取得に失敗しました');
      const data = await res.json();
      setAlerts(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [facilityId, showResolved]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const resolveAlert = useCallback(async (id: string) => {
    await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_resolved: true }),
    });
    await fetchAlerts();
  }, [fetchAlerts]);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true }),
    });
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
  }, []);

  const unreadCount = alerts.filter((a) => !a.is_read && !a.is_resolved).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.is_resolved).length;

  return {
    alerts,
    loading,
    error,
    unreadCount,
    criticalCount,
    refetch: fetchAlerts,
    resolveAlert,
    markRead,
  };
}
