'use client';

import { useCallback, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { DraftBanner } from '@/components/admin/DraftBanner';
import { RecordCard } from '@/components/admin/RecordCard';
import { BulkConfirmModal } from '@/components/admin/BulkConfirmModal';
import { AlertBadge } from '@/components/admin/AlertBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDrafts } from '@/hooks/useDrafts';
import { useAlerts } from '@/hooks/useAlerts';
import { useRealtimeRecords, useRealtimeAlerts } from '@/hooks/useRealtimeRecords';

export default function DashboardPage() {
  const { drafts, loading: draftsLoading, count: draftCount, confirmOne, refetch: refetchDrafts } = useDrafts();
  const { alerts, loading: alertsLoading, criticalCount, resolveAlert, refetch: refetchAlerts } = useAlerts();
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Realtime 購読（新しい記録が来たら自動更新）
  useRealtimeRecords(undefined, useCallback(({ eventType }) => {
    if (eventType === 'INSERT' || eventType === 'UPDATE') refetchDrafts();
  }, [refetchDrafts]));

  useRealtimeAlerts(undefined, useCallback(() => {
    refetchAlerts();
  }, [refetchAlerts]));

  const handleBulkConfirm = async (ids: string[]) => {
    await fetch('/api/records/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_ids: ids }),
    });
    refetchDrafts();
  };

  const sortedAlerts = [
    ...alerts.filter(a => a.severity === 'critical'),
    ...alerts.filter(a => a.severity === 'warning'),
    ...alerts.filter(a => a.severity === 'info'),
  ];

  return (
    <div>
      <TopBar title="ダッシュボード" draftCount={draftCount} />

      <div className="p-6 space-y-6 max-w-4xl">
        <DraftBanner count={draftCount} onBulkConfirm={() => setShowBulkModal(true)} />

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 mb-1">未確定</p>
              <p className={`text-3xl font-bold ${draftCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                {draftsLoading ? '—' : draftCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 mb-1">未解決アラート</p>
              <p className={`text-3xl font-bold ${alerts.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {alertsLoading ? '—' : alerts.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-500 mb-1">緊急アラート</p>
              <p className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {alertsLoading ? '—' : criticalCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 未確定の記録 */}
        {!draftsLoading && drafts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>未確定の記録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.map(record => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onConfirm={id => confirmOne(id, record.patient_candidates?.[0]?.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* アラート */}
        {!alertsLoading && sortedAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>アラート</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedAlerts.slice(0, 10).map(alert => (
                <AlertBadge key={alert.id} alert={alert} onResolve={resolveAlert} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {showBulkModal && (
        <BulkConfirmModal
          drafts={drafts}
          onConfirm={handleBulkConfirm}
          onClose={() => setShowBulkModal(false)}
        />
      )}
    </div>
  );
}
