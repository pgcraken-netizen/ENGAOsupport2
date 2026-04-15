'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AlertBadge } from '@/components/admin/AlertBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/types/alert';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!showResolved) params.set('is_resolved', 'false');
      const res = await fetch(`/api/alerts?${params}`);
      const data = await res.json();
      setAlerts(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (id: string) => {
    await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_resolved: true }),
    });
    fetchAlerts();
  };

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a) => a.severity === 'info');

  return (
    <div>
      <TopBar title="アラート" />
      <div className="p-6 max-w-3xl space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={showResolved ? 'outline' : 'default'}
            onClick={() => setShowResolved(false)}
          >
            未解決
          </Button>
          <Button
            size="sm"
            variant={showResolved ? 'default' : 'outline'}
            onClick={() => setShowResolved(true)}
          >
            解決済含む
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">読み込み中...</div>
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
                  {criticalAlerts.map((a) => (
                    <AlertBadge key={a.id} alert={a} onResolve={handleResolve} />
                  ))}
                </CardContent>
              </Card>
            )}
            {warningAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600">注意 ({warningAlerts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {warningAlerts.map((a) => (
                    <AlertBadge key={a.id} alert={a} onResolve={handleResolve} />
                  ))}
                </CardContent>
              </Card>
            )}
            {infoAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">情報 ({infoAlerts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {infoAlerts.map((a) => (
                    <AlertBadge key={a.id} alert={a} onResolve={handleResolve} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
