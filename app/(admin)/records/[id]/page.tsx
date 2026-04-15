'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CareRecord, Condition } from '@/types/record';
import { formatDateTime } from '@/lib/utils/dateUtils';
import { ArrowLeft } from 'lucide-react';

const conditionOptions: Condition[] = ['良好', '普通', '不良', '要観察'];

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<CareRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [condition, setCondition] = useState<string>('');
  const [conditionDetail, setConditionDetail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/records/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setRecord(d.data);
        setCondition(d.data?.condition ?? '');
        setConditionDetail(d.data?.condition_detail ?? '');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    await fetch(`/api/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition, condition_detail: conditionDetail }),
    });
    setEditing(false);
    const res = await fetch(`/api/records/${id}`);
    const data = await res.json();
    setRecord(data.data);
  };

  const handleConfirm = async () => {
    await fetch('/api/records/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_id: id,
        patient_id: record?.patient_id ?? record?.patient_candidates?.[0]?.id,
        condition,
        condition_detail: conditionDetail,
      }),
    });
    const res = await fetch(`/api/records/${id}`);
    const data = await res.json();
    setRecord(data.data);
    setEditing(false);
  };

  if (loading) return <div className="p-8 text-gray-500 text-sm">読み込み中...</div>;
  if (!record) return <div className="p-8 text-gray-500 text-sm">記録が見つかりません</div>;

  return (
    <div>
      <TopBar title="記録詳細" />
      <div className="p-6 max-w-2xl space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>記録情報</CardTitle>
              <div className="flex gap-2">
                <Badge variant={record.status === 'confirmed' ? 'default' : 'warning'}>
                  {record.status === 'confirmed' ? '確定済' : '未確定'}
                </Badge>
                {record.is_incident && <Badge variant="destructive">インシデント</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">記録日時</p>
              <p className="text-sm text-gray-900">{formatDateTime(record.recorded_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">元の投稿</p>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{record.original_text}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">利用者</p>
              <p className="text-sm text-gray-900">
                {record.patient?.name ?? record.patient_candidates?.[0]?.name ?? '未設定'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ケア内容</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {record.care_tags.map((tag) => (
                  <span key={tag} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {editing ? (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">状態</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full"
                  >
                    <option value="">未設定</option>
                    {conditionOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">詳細コメント</label>
                  <textarea
                    value={conditionDetail}
                    onChange={(e) => setConditionDetail(e.target.value)}
                    rows={3}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">保存</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>キャンセル</Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-gray-500">状態</p>
                  <p className="text-sm text-gray-900">{record.condition ?? '未設定'}</p>
                </div>
                {record.condition_detail && (
                  <div>
                    <p className="text-xs text-gray-500">詳細コメント</p>
                    <p className="text-sm text-gray-900">{record.condition_detail}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    修正
                  </Button>
                  {record.status === 'draft' && (
                    <Button size="sm" onClick={handleConfirm}>
                      確定する
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI解析情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">信頼度</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 rounded-full h-2"
                      style={{ width: `${Math.round(record.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{Math.round(record.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
