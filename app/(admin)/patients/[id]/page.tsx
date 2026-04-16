'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientTimeline } from '@/components/admin/PatientTimeline';
import { ConditionChart } from '@/components/admin/ConditionChart';
import { Patient } from '@/types/patient';
import { CareRecord } from '@/types/record';
import { ArrowLeft } from 'lucide-react';
import { formatPatientLabel } from '@/lib/utils/nameResolver';

type Period = '7d' | '30d' | 'all';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');

  useEffect(() => {
    fetch(`/api/patients/${id}?include_records=true`)
      .then(r => r.json())
      .then(d => {
        setPatient(d.data);
        setRecords(d.records ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 期間フィルター
  const filteredRecords = records.filter(r => {
    if (period === 'all') return true;
    const days = period === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(r.recorded_at) >= cutoff;
  });

  // ケア頻度集計
  const tagCounts = filteredRecords.reduce<Record<string, number>>((acc, r) => {
    r.care_tags.forEach(tag => { acc[tag] = (acc[tag] ?? 0) + 1; });
    return acc;
  }, {});
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (loading) return <div className="p-8 text-gray-400 text-sm">読み込み中...</div>;
  if (!patient) return <div className="p-8 text-gray-400 text-sm">利用者が見つかりません</div>;

  return (
    <div>
      <TopBar title={patient.name} />
      <div className="p-6 max-w-4xl space-y-4">

        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>

        {/* 利用者プロフィール */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{formatPatientLabel(patient)}</p>
                {patient.aliases.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">別称: {patient.aliases.join('、')}</p>
                )}
                {patient.notes && (
                  <p className="text-xs text-gray-500 mt-2 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                    {patient.notes}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {(['7d', '30d', 'all'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      period === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p === '7d' ? '7日' : p === '30d' ? '30日' : '全期間'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {/* 状態推移グラフ */}
          <Card>
            <CardHeader><CardTitle>状態推移</CardTitle></CardHeader>
            <CardContent><ConditionChart records={filteredRecords} /></CardContent>
          </Card>

          {/* ケア頻度 */}
          <Card>
            <CardHeader><CardTitle>ケア頻度</CardTitle></CardHeader>
            <CardContent>
              {sortedTags.length === 0 ? (
                <p className="text-sm text-gray-400">データなし</p>
              ) : (
                <div className="space-y-2.5">
                  {sortedTags.map(([tag, count]) => (
                    <div key={tag} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-20 flex-shrink-0 truncate">{tag}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 rounded-full h-2 transition-all"
                          style={{ width: `${(count / (sortedTags[0]?.[1] ?? 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-7 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 記録タイムライン */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>記録タイムライン</CardTitle>
              <span className="text-xs text-gray-400">{filteredRecords.length}件</span>
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
