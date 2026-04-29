'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientTimeline } from '@/components/admin/PatientTimeline';
import { ConditionChart } from '@/components/admin/ConditionChart';
import { Patient } from '@/types/patient';
import { CareRecord, AlertLevel } from '@/types/record';
import { ArrowLeft, FileText } from 'lucide-react';
import { formatPatientLabel } from '@/lib/utils/nameResolver';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type Period = '7d' | '30d' | 'all';

const ALERT_LEVEL_COLOR: Record<AlertLevel, string> = {
  '正常': 'bg-engao-green-light text-engao-green-dark',
  '観察': 'bg-yellow-100 text-yellow-700',
  '注意': 'bg-orange-100 text-orange-700',
  '警告': 'bg-red-100 text-red-700',
};

function ratingColor(value: string | null | undefined): string {
  if (!value) return 'text-engao-sub';
  const goodValues = ['完食', '8割', '良好', '普通', '正常', '十分'];
  const warnValues = ['半分', 'やや不調', '不規則', '少ない', '少量'];
  const badValues = ['少量', '不調', '困難', 'わずか'];
  const criticalValues = ['拒否', '重不調', 'なし'];
  if (criticalValues.includes(value)) return 'text-engao-danger font-bold';
  if (badValues.includes(value)) return 'text-orange-600';
  if (warnValues.includes(value)) return 'text-engao-warn';
  if (goodValues.includes(value)) return 'text-engao-green-dark';
  return 'text-engao-sub';
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    fetch(`/api/patients/${id}?include_records=true`)
      .then(r => r.json())
      .then(d => {
        setPatient(d.data);
        setRecords(d.records ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const filteredRecords = records.filter(r => {
    if (period === 'all') return true;
    const days = period === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(r.recorded_at) >= cutoff;
  });

  const liffRecords = filteredRecords.filter(r => r.input_mode === 'liff');

  const tagCounts = filteredRecords.reduce<Record<string, number>>((acc, r) => {
    r.care_tags.forEach(tag => { acc[tag] = (acc[tag] ?? 0) + 1; });
    return acc;
  }, {});
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (loading) return <div className="p-8 text-engao-sub text-sm">読み込み中...</div>;
  if (!patient) return <div className="p-8 text-engao-sub text-sm">利用者が見つかりません</div>;

  return (
    <div>
      <TopBar title={patient.name} />
      <div className="p-6 max-w-4xl space-y-4">

        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-engao-sub hover:text-engao-text">
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <Link
            href={`/reports/print/${id}`}
            className="flex items-center gap-1.5 text-xs bg-engao-green text-white px-3 py-1.5 rounded-lg hover:bg-engao-green-dark transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            帳票出力
          </Link>
        </div>

        {/* プロフィール */}
        <div className="bg-white rounded-xl border border-engao-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-engao-text">{patient.name}</h2>
              <p className="text-sm text-engao-sub mt-0.5">{formatPatientLabel(patient)}</p>
              {patient.aliases.length > 0 && (
                <p className="text-xs text-engao-sub mt-1">別称: {patient.aliases.join('、')}</p>
              )}
              {patient.notes && (
                <p className="text-xs text-engao-text mt-2 bg-engao-orange-light border border-engao-orange rounded px-2 py-1">
                  {patient.notes}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {(['7d', '30d', 'all'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    period === p
                      ? 'bg-engao-green text-white border-engao-green'
                      : 'border-engao-border text-engao-sub hover:bg-engao-bg'
                  }`}
                >
                  {p === '7d' ? '7日' : p === '30d' ? '30日' : '全期間'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LIFF記録一覧（5段階評価テーブル） */}
        {liffRecords.length > 0 && (
          <div className="bg-white rounded-xl border border-engao-border overflow-hidden">
            <div className="px-5 py-4 border-b border-engao-border">
              <h3 className="text-sm font-bold text-engao-text">記録一覧（スタッフ入力）</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-engao-bg border-b border-engao-border">
                    <th className="text-left px-4 py-2 text-xs text-engao-sub font-medium">日付</th>
                    <th className="text-center px-3 py-2 text-xs text-engao-sub font-medium">食事</th>
                    <th className="text-center px-3 py-2 text-xs text-engao-sub font-medium">健康</th>
                    <th className="text-center px-3 py-2 text-xs text-engao-sub font-medium">排泄</th>
                    <th className="text-center px-3 py-2 text-xs text-engao-sub font-medium">水分</th>
                    <th className="text-center px-3 py-2 text-xs text-engao-sub font-medium">状態</th>
                    <th className="text-left px-3 py-2 text-xs text-engao-sub font-medium">記録者</th>
                  </tr>
                </thead>
                <tbody>
                  {liffRecords.map(r => {
                    const alertLevel = (r.alert_level ?? '正常') as AlertLevel;
                    return (
                      <tr key={r.id} className="border-b border-engao-border hover:bg-engao-bg/50 transition-colors">
                        <td className="px-4 py-2.5 text-engao-text whitespace-nowrap">
                          {format(new Date(r.recorded_at), 'M/d(EEE)', { locale: ja })}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-medium ${ratingColor(r.meal)}`}>
                            {r.meal ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-medium ${ratingColor(r.health)}`}>
                            {r.health ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-medium ${ratingColor(r.excretion)}`}>
                            {r.excretion ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-medium ${ratingColor(r.hydration)}`}>
                            {r.hydration ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ALERT_LEVEL_COLOR[alertLevel]}`}>
                            {alertLevel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-engao-sub">
                          {r.staff?.name ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-engao-border">
            <CardHeader><CardTitle className="text-sm text-engao-text">状態推移</CardTitle></CardHeader>
            <CardContent><ConditionChart records={filteredRecords} /></CardContent>
          </Card>

          <Card className="border-engao-border">
            <CardHeader><CardTitle className="text-sm text-engao-text">タグ頻度</CardTitle></CardHeader>
            <CardContent>
              {sortedTags.length === 0 ? (
                <p className="text-sm text-engao-sub">データなし</p>
              ) : (
                <div className="space-y-2.5">
                  {sortedTags.map(([tag, count]) => (
                    <div key={tag} className="flex items-center gap-2">
                      <span className="text-xs text-engao-sub w-20 flex-shrink-0 truncate">{tag}</span>
                      <div className="flex-1 bg-engao-bg rounded-full h-2">
                        <div
                          className="bg-engao-green rounded-full h-2 transition-all"
                          style={{ width: `${(count / (sortedTags[0]?.[1] ?? 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-engao-sub w-7 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-engao-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-engao-text">全記録タイムライン</CardTitle>
              <span className="text-xs text-engao-sub">{filteredRecords.length}件</span>
            </div>
          </CardHeader>
          <CardContent>
            <PatientTimeline records={filteredRecords} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
