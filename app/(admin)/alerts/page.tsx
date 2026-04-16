'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AlertBadge } from '@/components/admin/AlertBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAlerts } from '@/hooks/useAlerts';

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
          <Button size="sm" variant={showResolved ? 'outline' : 'default'} onClick={() => setShowResolved(false)}>
            未解決
          </Button>
          <Button size="sm" variant={showResolved ? 'default' : 'outline'} onClick={() => setShowResolved(true)}>
            解決済含む
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">アラートはありません</div>
        ) : (
          <div className="space-y-4">
            {criticalAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">緊急 ({criticalAlerts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {criticalAlerts.map(a => <AlertBadge key={a.id} alert={a} onResolve={resolveAlert} />)}
                </CardContent>
              </Card>
            )}
            {warningAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600">注意 ({warningAlerts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {warningAlerts.map(a => <AlertBadge key={a.id} alert={a} onResolve={resolveAlert} />)}
                </CardContent>
              </Card>
            )}
            {infoAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">情報 ({infoAlerts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {infoAlerts.map(a => <AlertBadge key={a.id} alert={a} onResolve={resolveAlert} />)}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
