'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecordCard } from '@/components/admin/RecordCard';
import { ConditionChart } from '@/components/admin/ConditionChart';
import { Patient } from '@/types/patient';
import { CareRecord } from '@/types/record';
import { ArrowLeft } from 'lucide-react';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${id}?include_records=true`)
      .then((r) => r.json())
      .then((d) => {
        setPatient(d.data);
        setRecords(d.records ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ケア頻度集計
  const tagCounts = records.reduce<Record<string, number>>((acc, r) => {
    r.care_tags.forEach((tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
    });
    return acc;
  }, {});
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (loading) return <div className="p-8 text-gray-500 text-sm">読み込み中...</div>;
  if (!patient) return <div className="p-8 text-gray-500 text-sm">利用者が見つかりません</div>;

  return (
    <div>
      <TopBar title={patient.name} />
      <div className="p-6 max-w-3xl space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>

        {/* 利用者情報 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {patient.room_number ? `${patient.room_number}号室` : ''}
                  {patient.care_level ? ` ・ 要介護${patient.care_level}` : ''}
                </p>
                {patient.aliases.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    別称: {patient.aliases.join('、')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 状態推移グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>状態推移</CardTitle>
            </CardHeader>
            <CardContent>
              <ConditionChart records={records} />
            </CardContent>
          </Card>

          {/* ケア頻度 */}
          <Card>
            <CardHeader>
              <CardTitle>ケア頻度（確定記録）</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTags.length === 0 ? (
                <p className="text-sm text-gray-400">データなし</p>
              ) : (
                <div className="space-y-2">
                  {sortedTags.map(([tag, count]) => (
                    <div key={tag} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-24 flex-shrink-0">{tag}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 rounded-full h-2"
                          style={{
                            width: `${(count / (sortedTags[0]?.[1] ?? 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}回</span>
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
            <CardTitle>記録履歴</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-sm text-gray-400">記録がありません</p>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <RecordCard key={record.id} record={record} compact />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
