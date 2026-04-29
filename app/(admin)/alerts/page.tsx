'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AlertBadge } from '@/components/admin/AlertBadge';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export default function AlertsPage() {
  const [showResolved, setShowResolved] = useState(false);
  const { alerts, loading, resolveAlert } = useAlerts(undefined, showResolved);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts  = alerts.filter(a => a.severity === 'warning');
  const infoAlerts     = alerts.filter(a => a.severity === 'info');

  return (
    <div>
      <TopBar title="アラート" />
      <div className="p-6 max-w-3xl space-y-4">

        <div className="flex gap-2">
          <button
            onClick={() => setShowResolved(false)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              !showResolved
                ? 'bg-engao-green text-white border-engao-green'
                : 'border-engao-border text-engao-sub hover:bg-engao-bg'
            }`}
          >
            未解決
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              showResolved
                ? 'bg-engao-green text-white border-engao-green'
                : 'border-engao-border text-engao-sub hover:bg-engao-bg'
            }`}
          >
            解決済含む
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-engao-sub text-sm">読み込み中...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-engao-green-light flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-engao-sub text-sm">アラートはありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {criticalAlerts.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-bold text-red-700">警告 ({criticalAlerts.length})</span>
                </div>
                <div className="p-3 space-y-2">
                  {criticalAlerts.map(a => <AlertBadge key={a.id} alert={a} onResolve={resolveAlert} />)}
                </div>
              </div>
            )}
            {warningAlerts.length > 0 && (
              <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-bold text-orange-700">注意 ({warningAlerts.length})</span>
                </div>
                <div className="p-3 space-y-2">
                  {warningAlerts.map(a => <AlertBadge key={a.id} alert={a} onResolve={resolveAlert} />)}
                </div>
              </div>
            )}
            {infoAlerts.length > 0 && (
              <div className="bg-white rounded-xl border border-yellow-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 border-b border-yellow-200">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-700">観察 ({infoAlerts.length})</span>
                </div>
                <div className="p-3 space-y-2">
                  {infoAlerts.map(a => <AlertBadge key={a.id} alert={a} onResolve={resolveAlert} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
