'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { DraftBanner } from '@/components/admin/DraftBanner';
import { RecordCard } from '@/components/admin/RecordCard';
import { AlertBadge } from '@/components/admin/AlertBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CareRecord } from '@/types/record';
import { Alert } from '@/types/alert';

interface Stats {
  confirmed: number;
  draft: number;
}

export default function DashboardPage() {
  const [drafts, setDrafts] = useState<CareRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats>({ confirmed: 0, draft: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [draftsRes, alertsRes, confirmedRes] = await Promise.all([
        fetch('/api/records/drafts'),
        fetch('/api/alerts?is_resolved=false'),
        fetch('/api/records?status=confirmed&limit=1'),
      ]);

      const draftsData = await draftsRes.json();
      const alertsData = await alertsRes.json();
      const confirmedData = await confirmedRes.json();

      setDrafts(draftsData.data ?? []);
      setAlerts(alertsData.data ?? []);
      setStats({
        confirmed: confirmedData.count ?? 0,
        draft: draftsData.data?.length ?? 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // 30秒ごとに更新
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleConfirm = async (id: string) => {
    const record = drafts.find((r) => r.id === id);
    const patientId = record?.patient_candidates?.[0]?.id ?? null;

    await fetch('/api/records/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: id, patient_id: patientId }),
    });
    fetchData();
  };

  const handleBulkConfirm = async () => {
    if (!confirm(`未確定の記録 ${drafts.length} 件をすべて確定しますか？`)) return;
    await fetch('/api/records/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_ids: drafts.map((r) => r.id) }),
    });
    fetchData();
  };

  const handleResolveAlert = async (id: string) => {
    await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_resolved: true }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        読み込み中...
      </div>
    );
  }

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a) => a.severity === 'info');
  const sortedAlerts = [...criticalAlerts, ...warningAlerts, ...infoAlerts];

  return (
    <div>
      <TopBar title="ダッシュボード" draftCount={stats.draft} />
      <div className="p-6 space-y-6 max-w-4xl">
        <DraftBanner count={stats.draft} onBulkConfirm={handleBulkConfirm} />

        {/* 統計カード */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">今日の確定記録</p>
              <p className="text-3xl font-bold text-gray-900">{stats.confirmed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">未確定</p>
              <p className="text-3xl font-bold text-orange-600">{stats.draft}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">未解決アラート</p>
              <p className="text-3xl font-bold text-red-600">{alerts.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* 未確定記録 */}
        {drafts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>未確定の記録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onConfirm={handleConfirm}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* アラート */}
        {sortedAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>アラート</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedAlerts.slice(0, 10).map((alert) => (
                <AlertBadge
                  key={alert.id}
                  alert={alert}
                  onResolve={handleResolveAlert}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
