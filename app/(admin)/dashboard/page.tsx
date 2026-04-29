'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { DraftBanner } from '@/components/admin/DraftBanner';
import { BulkConfirmModal } from '@/components/admin/BulkConfirmModal';
import { AlertBadge } from '@/components/admin/AlertBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDrafts } from '@/hooks/useDrafts';
import { useAlerts } from '@/hooks/useAlerts';
import { useRealtimeRecords, useRealtimeAlerts } from '@/hooks/useRealtimeRecords';
import { CareRecord } from '@/types/record';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronRight, AlertTriangle, ClipboardCheck, Users } from 'lucide-react';

const ALERT_COLORS: Record<string, string> = {
  '警告': 'bg-red-100 text-red-700 border-red-300',
  '注意': 'bg-orange-100 text-orange-700 border-orange-300',
  '観察': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  '正常': 'bg-engao-green-light text-engao-green-dark border-engao-green',
};

function AlertLevelBadge({ level }: { level: string }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ALERT_COLORS[level] ?? ALERT_COLORS['正常']}`}>
      {level}
    </span>
  );
}

export default function DashboardPage() {
  const { drafts, loading: draftsLoading, count: draftCount, confirmOne, refetch: refetchDrafts } = useDrafts();
  const { alerts, loading: alertsLoading, criticalCount, resolveAlert, refetch: refetchAlerts } = useAlerts();
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [recentLiff, setRecentLiff] = useState<CareRecord[]>([]);

  useRealtimeRecords(undefined, useCallback(({ eventType }) => {
    if (eventType === 'INSERT' || eventType === 'UPDATE') refetchDrafts();
  }, [refetchDrafts]));

  useRealtimeAlerts(undefined, useCallback(() => {
    refetchAlerts();
  }, [refetchAlerts]));

  useEffect(() => {
    fetch('/api/records?input_mode=liff&status=confirmed&limit=5')
      .then(r => r.json())
      .then(d => setRecentLiff(d.data ?? []));
  }, []);

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

  const warningCount = alerts.filter(a => a.severity !== 'info').length;

  return (
    <div>
      <TopBar title="ダッシュボード" draftCount={draftCount} />

      <div className="p-6 space-y-5 max-w-5xl">
        <DraftBanner count={draftCount} onBulkConfirm={() => setShowBulkModal(true)} />

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-engao-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="h-4 w-4 text-engao-sub" />
                <p className="text-xs text-engao-sub">未確定記録</p>
              </div>
              <p className={`text-3xl font-bold ${draftCount > 0 ? 'text-engao-warn' : 'text-engao-text'}`}>
                {draftsLoading ? '—' : draftCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-engao-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-engao-sub" />
                <p className="text-xs text-engao-sub">要対応アラート</p>
              </div>
              <p className={`text-3xl font-bold ${warningCount > 0 ? 'text-engao-warn' : 'text-engao-text'}`}>
                {alertsLoading ? '—' : warningCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-engao-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-xs text-engao-sub">緊急アラート</p>
              </div>
              <p className={`text-3xl font-bold ${criticalCount > 0 ? 'text-engao-danger' : 'text-engao-text'}`}>
                {alertsLoading ? '—' : criticalCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* アラート */}
          {!alertsLoading && sortedAlerts.length > 0 && (
            <Card className="border-engao-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-engao-text">アラート</CardTitle>
                  <Link href="/alerts" className="text-xs text-engao-green hover:underline">
                    すべて見る
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {sortedAlerts.slice(0, 6).map(alert => (
                  <AlertBadge key={alert.id} alert={alert} onResolve={resolveAlert} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* 最近のLIFF記録 */}
          {recentLiff.length > 0 && (
            <Card className="border-engao-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-engao-text">最近の記録（スタッフ入力）</CardTitle>
                  <Link href="/records?input_mode=liff" className="text-xs text-engao-green hover:underline">
                    すべて見る
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {recentLiff.map(r => (
                  <Link key={r.id} href={`/records/${r.id}`}>
                    <div className="flex items-center justify-between py-2 border-b border-engao-border last:border-b-0 hover:bg-engao-bg rounded transition-colors px-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-engao-text">
                            {r.patient?.name ?? '—'}
                          </span>
                          <AlertLevelBadge level={r.alert_level ?? '正常'} />
                        </div>
                        <p className="text-xs text-engao-sub mt-0.5">
                          {r.staff?.name} ·{' '}
                          {format(new Date(r.recorded_at), 'M/d HH:mm', { locale: ja })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-engao-sub" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 未確定の記録 */}
        {!draftsLoading && drafts.length > 0 && (
          <Card className="border-engao-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-engao-text">未確定の記録（AIBot）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {drafts.map(record => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b border-engao-border last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-engao-text truncate">{record.original_text || '(本文なし)'}</p>
                    <p className="text-xs text-engao-sub mt-0.5">
                      {record.patient_candidates?.[0]?.name ?? '利用者未特定'} ·{' '}
                      {format(new Date(record.created_at), 'M/d HH:mm', { locale: ja })}
                    </p>
                  </div>
                  <button
                    onClick={() => confirmOne(record.id, record.patient_candidates?.[0]?.id)}
                    className="ml-3 text-xs bg-engao-green text-white px-3 py-1 rounded-full whitespace-nowrap hover:bg-engao-green-dark transition-colors"
                  >
                    確定
                  </button>
                </div>
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
