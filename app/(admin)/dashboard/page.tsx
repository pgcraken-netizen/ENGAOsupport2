'use client';

import { useCallback, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { DraftBanner } from '@/components/admin/DraftBanner';
import { RecordCard } from '@/components/admin/RecordCard';
import { BulkConfirmModal } from '@/components/admin/BulkConfirmModal';
import { AlertBadge } from '@/components/admin/AlertBadge';
import { useDrafts } from '@/hooks/useDrafts';
import { useAlerts } from '@/hooks/useAlerts';
import { useRealtimeRecords, useRealtimeAlerts } from '@/hooks/useRealtimeRecords';

export default function DashboardPage() {
  const { drafts, loading: draftsLoading, count: draftCount, confirmOne, refetch: refetchDrafts } = useDrafts();
  const { alerts, loading: alertsLoading, criticalCount, resolveAlert, refetch: refetchAlerts } = useAlerts();
  const [showBulkModal, setShowBulkModal] = useState(false);

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
    <div className="min-h-full">
      <TopBar title="ダッシュボード" draftCount={draftCount} />

      <div className="p-4 md:p-6 space-y-4 max-w-2xl md:max-w-4xl mx-auto">

        {/* 未確定バナー */}
        <DraftBanner count={draftCount} onBulkConfirm={() => setShowBulkModal(true)} />

        {/* サマリー — モバイルで3カラム均等 */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100 text-center">
            <p className="text-[11px] md:text-xs text-gray-500 mb-1">未確定</p>
            <p className={`text-2xl md:text-3xl font-bold ${draftCount > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
              {draftsLoading ? '—' : draftCount}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100 text-center">
            <p className="text-[11px] md:text-xs text-gray-500 mb-1">アラート</p>
            <p className={`text-2xl md:text-3xl font-bold ${alerts.length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {alertsLoading ? '—' : alerts.length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100 text-center">
            <p className="text-[11px] md:text-xs text-gray-500 mb-1">緊急</p>
            <p className={`text-2xl md:text-3xl font-bold ${criticalCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
              {alertsLoading ? '—' : criticalCount}
            </p>
          </div>
        </div>

        {/* アラートセクション */}
        {!alertsLoading && sortedAlerts.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
              未解決アラート
            </h3>
            <div className="space-y-2">
              {sortedAlerts.map((alert) => (
                <AlertBadge key={alert.id} alert={alert} onResolve={() => { resolveAlert(alert.id); }} />
              ))}
            </div>
          </section>
        )}

        {/* 未確定の記録 */}
        {!draftsLoading && drafts.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full inline-block" />
              確定待ちの記録
            </h3>
            <div className="space-y-2">
              {drafts.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onConfirm={() => { confirmOne(record.id); }}
                  onRefresh={refetchDrafts}
                />
              ))}
            </div>
          </section>
        )}

        {/* 空状態 */}
        {!draftsLoading && !alertsLoading && drafts.length === 0 && alerts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-sm">未確定の記録・アラートはありません</p>
          </div>
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
