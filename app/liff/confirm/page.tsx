'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiffRecordInput } from '@/types/record';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function LiffConfirmPage() {
  const router = useRouter();
  const [input, setInput] = useState<LiffRecordInput | null>(null);
  const [patientName, setPatientName] = useState('');
  const [staffName, setStaffName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();

  useEffect(() => {
    const raw = sessionStorage.getItem('liff_record_input');
    if (!raw) { router.replace('/liff/patients'); return; }
    setInput(JSON.parse(raw) as LiffRecordInput);
    setPatientName(sessionStorage.getItem('liff_patient_name') ?? '');
    setStaffName(sessionStorage.getItem('liff_staff_name') ?? sessionStorage.getItem('liff_display_name') ?? '');
  }, [router]);

  const handleSave = async () => {
    if (!input) return;
    setSaving(true);
    setError('');
    try {
      const staffId = sessionStorage.getItem('liff_staff_id') ?? null;
      const lineUserId = sessionStorage.getItem('liff_line_user_id') ?? null;

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: input.patient_id,
          staff_id: staffId,
          line_user_id: lineUserId,
          meal: input.meal,
          health: input.health,
          excretion: input.excretion,
          hydration: input.hydration,
          care_tags: input.tags,
          comment: input.comment,
          input_mode: 'liff',
          status: 'confirmed',
          original_text: '',
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? '保存に失敗しました');
        return;
      }
      sessionStorage.removeItem('liff_record_input');
      sessionStorage.removeItem('liff_patient_name');
      setSaved(true);
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="liff-page flex items-center justify-center">
        <div className="text-center px-6 py-12">
          <CheckCircle className="h-16 w-16 text-engao-green mx-auto mb-4" />
          <h2 className="text-xl font-bold text-engao-text mb-2">保存しました</h2>
          <p className="text-sm text-engao-sub mb-8">記録が保存されました</p>
          <button
            onClick={() => router.replace('/liff/patients')}
            className="w-full bg-engao-green text-white font-bold py-4 rounded-xl text-base active:scale-95 transition-all"
          >
            利用者一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  if (!input) {
    return (
      <div className="liff-page flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-engao-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rows = [
    { label: '食事', value: input.meal },
    { label: '健康', value: input.health },
    { label: '排泄', value: input.excretion },
    { label: '水分', value: input.hydration },
  ];

  const normalValues = ['完食', '良好', '正常', '十分'];
  const isNormal = (v: string) => normalValues.includes(v);

  return (
    <div className="liff-page pb-32">
      <div className="bg-engao-green px-4 py-4">
        <button onClick={() => router.back()} className="flex items-center text-white/80 text-sm mb-2">
          <ChevronLeft className="h-4 w-4" />
          戻る（修正）
        </button>
        <h1 className="text-white font-bold text-lg">内容確認</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* 利用者 & スタッフ */}
        <div className="bg-white rounded-xl border border-engao-border px-4 py-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-engao-sub">利用者</span>
            <span className="font-bold text-engao-text">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-engao-sub">記録者</span>
            <span className="text-sm text-engao-text">{staffName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-engao-sub">記録日時</span>
            <span className="text-sm text-engao-text">
              {format(now, 'M月d日(EEE) HH:mm', { locale: ja })}
            </span>
          </div>
        </div>

        {/* 状態 */}
        <div className="bg-white rounded-xl border border-engao-border px-4 py-4">
          <p className="text-xs font-bold text-engao-sub mb-3">【 状 態 】</p>
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-sm text-engao-sub">{r.label}</span>
                <span className={`text-sm font-bold px-3 py-0.5 rounded-full ${
                  isNormal(r.value)
                    ? 'bg-engao-green-light text-engao-green-dark'
                    : 'bg-engao-orange-light text-engao-warn'
                }`}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* タグ */}
        {input.tags.length > 0 && (
          <div className="bg-white rounded-xl border border-engao-border px-4 py-4">
            <p className="text-xs font-bold text-engao-sub mb-3">【 タ グ 】</p>
            <div className="flex flex-wrap gap-2">
              {input.tags.map(tag => (
                <span key={tag} className="bg-engao-orange text-white text-xs px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* コメント */}
        {input.comment && (
          <div className="bg-white rounded-xl border border-engao-border px-4 py-4">
            <p className="text-xs font-bold text-engao-sub mb-2">【 コメント 】</p>
            <p className="text-sm text-engao-text whitespace-pre-wrap">{input.comment}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-engao-danger bg-engao-danger-light rounded-xl px-4 py-3">
            {error}
          </p>
        )}
      </div>

      {/* フッター */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto px-4 py-4 bg-engao-bg border-t border-engao-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-engao-green text-white font-bold py-4 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-all shadow-md"
        >
          {saving ? '保存中...' : 'OK（保存）'}
        </button>
      </div>
    </div>
  );
}
