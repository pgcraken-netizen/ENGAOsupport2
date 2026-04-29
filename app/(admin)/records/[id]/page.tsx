'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { CareRecord, AlertLevel, MEAL_OPTIONS, HEALTH_OPTIONS, EXCRETION_OPTIONS, HYDRATION_OPTIONS } from '@/types/record';
import { formatDateTime } from '@/lib/utils/dateUtils';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

const ALERT_COLORS: Record<AlertLevel, string> = {
  '正常': 'bg-engao-green-light text-engao-green-dark border border-engao-green',
  '観察': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  '注意': 'bg-orange-100 text-orange-700 border border-orange-300',
  '警告': 'bg-red-100 text-red-700 border border-red-300',
};

function RatingValue({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-engao-sub">—</span>;
  const bad = ['少量', '拒否', '不調', '重不調', '困難', 'なし', 'わずか'];
  const warn = ['半分', 'やや不調', '不規則', '少ない'];
  const cls = bad.includes(value)
    ? 'text-engao-danger font-bold'
    : warn.includes(value)
      ? 'text-engao-warn font-medium'
      : 'text-engao-green-dark font-medium';
  return <span className={cls}>{value}</span>;
}

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<CareRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [editMeal, setEditMeal] = useState('');
  const [editHealth, setEditHealth] = useState('');
  const [editExcretion, setEditExcretion] = useState('');
  const [editHydration, setEditHydration] = useState('');
  const [editComment, setEditComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRecord = async () => {
    const res = await fetch(`/api/records/${id}`);
    const d = await res.json();
    setRecord(d.data);
    setEditMeal(d.data?.meal ?? '');
    setEditHealth(d.data?.health ?? '');
    setEditExcretion(d.data?.excretion ?? '');
    setEditHydration(d.data?.hydration ?? '');
    setEditComment(d.data?.comment ?? d.data?.condition_detail ?? '');
  };

  useEffect(() => {
    loadRecord().finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meal: editMeal || null,
        health: editHealth || null,
        excretion: editExcretion || null,
        hydration: editHydration || null,
        comment: editComment || null,
      }),
    });
    await loadRecord();
    setEditing(false);
    setSaving(false);
  };

  const handleConfirm = async () => {
    setSaving(true);
    await fetch('/api/records/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_id: id,
        patient_id: record?.patient_id ?? record?.patient_candidates?.[0]?.id,
      }),
    });
    await loadRecord();
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-engao-sub text-sm">読み込み中...</div>;
  if (!record) return <div className="p-8 text-engao-sub text-sm">記録が見つかりません</div>;

  const alertLevel = (record.alert_level ?? '正常') as AlertLevel;
  const isLiff = record.input_mode === 'liff';

  return (
    <div>
      <TopBar title="記録詳細" />
      <div className="p-6 max-w-2xl space-y-4">

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-engao-sub hover:text-engao-text"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          {record.patient_id && (
            <Link
              href={`/reports/print/${record.patient_id}`}
              className="flex items-center gap-1.5 text-xs text-engao-green hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              帳票出力
            </Link>
          )}
        </div>

        {/* ステータスバー */}
        <div className="bg-white rounded-xl border border-engao-border p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-engao-text">
                {record.patient?.name ?? record.patient_candidates?.[0]?.name ?? '利用者不明'}
              </h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ALERT_COLORS[alertLevel]}`}>
                {alertLevel}
              </span>
            </div>
            <p className="text-xs text-engao-sub mt-0.5">
              {formatDateTime(record.recorded_at)} ·{' '}
              {record.staff?.name ?? record.line_display_name ?? '不明'} ·{' '}
              {isLiff ? 'LIFF入力' : 'LINEBot'}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            record.status === 'confirmed'
              ? 'bg-engao-green-light text-engao-green-dark'
              : 'bg-engao-orange-light text-engao-warn'
          }`}>
            {record.status === 'confirmed' ? '確定済' : '未確定'}
          </span>
        </div>

        {/* LIFF 5段階評価表示 */}
        {isLiff && (
          <div className="bg-white rounded-xl border border-engao-border overflow-hidden">
            <div className="px-4 py-3 border-b border-engao-border bg-engao-bg">
              <p className="text-xs font-bold text-engao-sub">【 状 態 】</p>
            </div>

            {editing ? (
              <div className="p-4 space-y-3">
                {[
                  { label: '食事', key: 'meal', val: editMeal, set: setEditMeal, opts: MEAL_OPTIONS },
                  { label: '健康', key: 'health', val: editHealth, set: setEditHealth, opts: HEALTH_OPTIONS },
                  { label: '排泄', key: 'excretion', val: editExcretion, set: setEditExcretion, opts: EXCRETION_OPTIONS },
                  { label: '水分', key: 'hydration', val: editHydration, set: setEditHydration, opts: HYDRATION_OPTIONS },
                ].map(({ label, val, set, opts }) => (
                  <div key={label}>
                    <p className="text-xs text-engao-sub mb-1.5">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opts.map((opt, idx) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set(opt)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            val === opt
                              ? idx === 0 ? 'bg-engao-green text-white border-engao-green'
                                : idx === 1 ? 'bg-engao-green-light text-engao-green-dark border-engao-green'
                                : idx === 2 ? 'bg-engao-orange-light text-engao-warn border-engao-orange'
                                : 'bg-red-100 text-engao-danger border-engao-danger'
                              : 'bg-white text-engao-sub border-engao-border hover:bg-engao-bg'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-engao-sub mb-1.5">コメント</p>
                  <textarea
                    value={editComment}
                    onChange={e => setEditComment(e.target.value)}
                    rows={3}
                    className="w-full border border-engao-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-engao-green"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-engao-green text-white px-4 py-2 rounded-lg text-sm hover:bg-engao-green-dark disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="border border-engao-border px-4 py-2 rounded-lg text-sm text-engao-sub hover:bg-engao-bg"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { label: '食事', value: record.meal },
                    { label: '健康', value: record.health },
                    { label: '排泄', value: record.excretion },
                    { label: '水分', value: record.hydration },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between bg-engao-bg rounded-lg px-3 py-2">
                      <span className="text-xs text-engao-sub">{label}</span>
                      <RatingValue value={value} />
                    </div>
                  ))}
                </div>
                {(record.comment || record.condition_detail) && (
                  <div className="bg-engao-bg rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-engao-sub mb-1">コメント</p>
                    <p className="text-sm text-engao-text">{record.comment ?? record.condition_detail}</p>
                  </div>
                )}
                {record.care_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {record.care_tags.map(tag => (
                      <span key={tag} className="bg-engao-orange text-white text-xs px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* LINEBot テキスト表示 */}
        {!isLiff && (
          <div className="bg-white rounded-xl border border-engao-border p-4 space-y-3">
            <p className="text-xs font-bold text-engao-sub">【 LINEBot 記録 】</p>
            <div className="bg-engao-bg rounded-lg px-3 py-2">
              <p className="text-xs text-engao-sub mb-1">元の投稿</p>
              <p className="text-sm text-engao-text">{record.original_text || '(本文なし)'}</p>
            </div>
            {record.condition && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-engao-sub">状態:</span>
                <RatingValue value={record.condition} />
              </div>
            )}
            {record.condition_detail && (
              <p className="text-sm text-engao-text">{record.condition_detail}</p>
            )}
            {record.care_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {record.care_tags.map(tag => (
                  <span key={tag} className="bg-engao-orange text-white text-xs px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {record.is_incident && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs font-bold text-red-700">インシデント</p>
                <p className="text-sm text-red-600 mt-0.5">{record.incident_keywords?.join('・')}</p>
              </div>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="border border-engao-border px-4 py-2 rounded-lg text-sm text-engao-sub hover:bg-engao-bg transition-colors"
            >
              修正
            </button>
          )}
          {record.status === 'draft' && !editing && (
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="bg-engao-green text-white px-4 py-2 rounded-lg text-sm hover:bg-engao-green-dark disabled:opacity-50 transition-colors"
            >
              {saving ? '確定中...' : '確定する'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
