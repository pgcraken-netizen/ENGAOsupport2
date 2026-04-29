'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Patient } from '@/types/patient';
import {
  MEAL_OPTIONS, HEALTH_OPTIONS, EXCRETION_OPTIONS, HYDRATION_OPTIONS,
  DEFAULT_TAGS, LiffRecordInput, MealRating, HealthRating, ExcretionRating, HydrationRating,
} from '@/types/record';
import { RatingRow } from '@/components/liff/RatingRow';
import { TagChips } from '@/components/liff/TagChips';
import { ChevronLeft } from 'lucide-react';

const DEFAULT_FORM: Omit<LiffRecordInput, 'patient_id'> = {
  meal: '完食',
  health: '良好',
  excretion: '正常',
  hydration: '十分',
  tags: [],
  comment: '',
};

export default function LiffRecordPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${patientId}`)
      .then(r => r.json())
      .then(d => setPatient(d.data ?? null))
      .finally(() => setLoading(false));
  }, [patientId]);

  const setAll = () => setForm(DEFAULT_FORM);

  const isAllNormal =
    form.meal === '完食' &&
    form.health === '良好' &&
    form.excretion === '正常' &&
    form.hydration === '十分' &&
    form.tags.length === 0;

  const handleQuickSave = () => {
    const input: LiffRecordInput = { ...form, patient_id: patientId };
    sessionStorage.setItem('liff_record_input', JSON.stringify(input));
    sessionStorage.setItem('liff_patient_name', patient?.name ?? '');
    router.push('/liff/confirm');
  };

  if (loading) {
    return (
      <div className="liff-page flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-engao-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="liff-page flex items-center justify-center p-8">
        <p className="text-engao-sub text-sm">利用者が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="liff-page pb-32">
      {/* ヘッダー */}
      <div className="bg-engao-green px-4 py-4">
        <button onClick={() => router.back()} className="flex items-center text-white/80 text-sm mb-2">
          <ChevronLeft className="h-4 w-4" />
          戻る
        </button>
        <h1 className="text-white font-bold text-xl">{patient.name}</h1>
        {patient.room_number && (
          <p className="text-white/70 text-sm">{patient.room_number}号室</p>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 状態入力カード */}
        <div className="bg-white rounded-xl border border-engao-border overflow-hidden">
          <div className="px-4 pt-4 pb-1">
            <p className="text-xs font-bold text-engao-sub uppercase tracking-wide">【 状 態 】</p>
          </div>
          <div className="px-4">
            <RatingRow
              label="食事"
              options={MEAL_OPTIONS}
              value={form.meal}
              onChange={v => setForm(f => ({ ...f, meal: v as MealRating }))}
            />
            <RatingRow
              label="健康"
              options={HEALTH_OPTIONS}
              value={form.health}
              onChange={v => setForm(f => ({ ...f, health: v as HealthRating }))}
            />
            <RatingRow
              label="排泄"
              options={EXCRETION_OPTIONS}
              value={form.excretion}
              onChange={v => setForm(f => ({ ...f, excretion: v as ExcretionRating }))}
            />
            <RatingRow
              label="水分"
              options={HYDRATION_OPTIONS}
              value={form.hydration}
              onChange={v => setForm(f => ({ ...f, hydration: v as HydrationRating }))}
            />
          </div>
          <div className="px-4 pb-4 pt-1">
            {!isAllNormal && (
              <button
                type="button"
                onClick={setAll}
                className="text-xs text-engao-sub underline mt-1"
              >
                すべてリセット
              </button>
            )}
          </div>
        </div>

        {/* タグ */}
        <div className="bg-white rounded-xl border border-engao-border px-4 py-4">
          <p className="text-xs font-bold text-engao-sub uppercase tracking-wide mb-3">【 タ グ 】</p>
          <TagChips
            tags={DEFAULT_TAGS}
            selected={form.tags}
            onChange={tags => setForm(f => ({ ...f, tags }))}
          />
        </div>

        {/* コメント */}
        <div className="bg-white rounded-xl border border-engao-border px-4 py-4">
          <p className="text-xs font-bold text-engao-sub uppercase tracking-wide mb-3">【 コメント 】</p>
          <textarea
            value={form.comment}
            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            placeholder="特記事項があれば入力"
            rows={3}
            className="w-full bg-engao-bg rounded-lg border border-engao-border px-3 py-2 text-sm text-engao-text resize-none focus:outline-none focus:ring-2 focus:ring-engao-green"
          />
        </div>
      </div>

      {/* フッターボタン */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto px-4 py-4 bg-engao-bg border-t border-engao-border space-y-2">
        {isAllNormal ? (
          <button
            onClick={handleQuickSave}
            className="w-full bg-engao-green text-white font-bold py-4 rounded-xl text-base active:scale-95 transition-all shadow-md"
          >
            異常なしで登録
          </button>
        ) : (
          <button
            onClick={handleQuickSave}
            className="w-full bg-engao-green text-white font-bold py-4 rounded-xl text-base active:scale-95 transition-all shadow-md"
          >
            確認へ進む
          </button>
        )}
      </div>
    </div>
  );
}
