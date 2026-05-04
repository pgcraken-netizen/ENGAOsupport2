'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Patient } from '@/types/patient';
import {
  MealScore, HealthScore, ExcretionScore, HydrationScore,
  MEAL_OPTIONS, HEALTH_OPTIONS, EXCRETION_OPTIONS, HYDRATION_OPTIONS,
  CARE_TAGS,
  MEAL_NEGATIVE, HEALTH_NEGATIVE, EXCRETION_NEGATIVE, HYDRATION_NEGATIVE,
} from '@/types/record';

// ─── 初期値（すべて「良好」状態） ───────────────────────────────
const DEFAULT_MEAL: MealScore           = '完食';
const DEFAULT_HEALTH: HealthScore       = '良好';
const DEFAULT_EXCRETION: ExcretionScore = '正常';
const DEFAULT_HYDRATION: HydrationScore = '十分';

type Step = 'input' | 'confirm' | 'done';

function ScoreButtons<T extends string>({
  options,
  value,
  onChange,
  negativeValues,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  negativeValues: readonly T[];
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => {
        const isSelected = opt === value;
        const isNeg = negativeValues.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={[
              'px-3 py-2 rounded-lg text-sm font-medium border transition-all min-w-[60px]',
              isSelected
                ? isNeg
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-engao-green text-white border-engao-green'
                : 'bg-white text-engao-text border-engao-border hover:bg-engao-green-light',
            ].join(' ')}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function InputFormPage() {
  const params    = useParams();
  const router    = useRouter();
  const patientId = params.patientId as string;

  const [patient,   setPatient]   = useState<Patient | null>(null);
  const [staffName, setStaffName] = useState('');
  const [step,      setStep]      = useState<Step>('input');
  const [saving,    setSaving]    = useState(false);

  // ─── フォーム状態 ───────────────────────────────────────────
  const [meal,      setMeal]      = useState<MealScore>(DEFAULT_MEAL);
  const [health,    setHealth]    = useState<HealthScore>(DEFAULT_HEALTH);
  const [excretion, setExcretion] = useState<ExcretionScore>(DEFAULT_EXCRETION);
  const [hydration, setHydration] = useState<HydrationScore>(DEFAULT_HYDRATION);
  const [tags,      setTags]      = useState<string[]>([]);
  const [comment,   setComment]   = useState('');

  useEffect(() => {
    const name = localStorage.getItem('engao-staff-name') ?? '';
    setStaffName(name);
    if (!name) { router.replace('/input'); return; }

    fetch(`/api/patients/${patientId}`)
      .then(r => r.json())
      .then(d => setPatient(d.data ?? null));
  }, [patientId, router]);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const resetToDefault = () => {
    setMeal(DEFAULT_MEAL);
    setHealth(DEFAULT_HEALTH);
    setExcretion(DEFAULT_EXCRETION);
    setHydration(DEFAULT_HYDRATION);
    setTags([]);
    setComment('');
  };

  const handleQuickSave = () => {
    resetToDefault();
    setStep('confirm');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const facilityId = patient?.facility_id;

      let staffId: string | null = null;
      try {
        const staffRes  = await fetch(`/api/staff?name=${encodeURIComponent(staffName)}`);
        const staffData = await staffRes.json();
        staffId = staffData.data?.[0]?.id ?? null;
      } catch {
        // スタッフID取得失敗は無視
      }

      const body = {
        facility_id:      facilityId,
        patient_id:       patientId,
        staff_id:         staffId,
        line_display_name: staffName,
        status:           'confirmed',
        meal,
        health,
        excretion,
        hydration,
        care_tags:        tags,
        comment:          comment.trim() || null,
        original_text:    `[Web入力] ${staffName} - ${patient?.name ?? ''}`,
        confidence:       1.0,
        recorded_at:      new Date().toISOString(),
      };

      const res = await fetch('/api/records', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');
      setStep('done');
    } catch {
      alert('保存に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-engao-bg flex items-center justify-center">
        <p className="text-engao-sub text-sm">読み込み中...</p>
      </div>
    );
  }

  // ─── 完了画面 ───────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-engao-bg flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-engao-green-light flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-engao-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-engao-text">保存しました</h2>
          <p className="text-engao-sub text-sm mt-1">{patient.name}さんの記録</p>
        </div>
        <button
          onClick={() => router.push('/input')}
          className="w-full max-w-xs bg-engao-green text-white py-4 rounded-2xl text-base font-medium"
        >
          続けて記録する
        </button>
      </div>
    );
  }

  // ─── 確認画面 ───────────────────────────────────────────────
  if (step === 'confirm') {
    const scoreRows: [string, string, readonly string[]][] = [
      ['食事', meal,      MEAL_NEGATIVE],
      ['健康', health,    HEALTH_NEGATIVE],
      ['排泄', excretion, EXCRETION_NEGATIVE],
      ['水分', hydration, HYDRATION_NEGATIVE],
    ];
    return (
      <div className="min-h-screen bg-engao-bg pb-10">
        <header className="bg-engao-green text-white px-4 py-4">
          <button onClick={() => setStep('input')} className="text-sm text-green-100 mb-1">← 修正する</button>
          <h1 className="text-lg font-bold">確認</h1>
        </header>

        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
          <div className="bg-white rounded-2xl border border-engao-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-engao-text">{patient.name}</span>
              <span className="text-xs text-engao-sub">{new Date().toLocaleString('ja-JP')}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {scoreRows.map(([label, val, neg]) => (
                <div key={label} className="bg-engao-bg rounded-lg p-3">
                  <p className="text-xs text-engao-sub mb-1">{label}</p>
                  <p className={`font-semibold ${neg.includes(val) ? 'text-red-500' : 'text-engao-green'}`}>
                    {val}
                  </p>
                </div>
              ))}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <span key={t}
                    className="bg-engao-yellow-light text-amber-700 border border-engao-yellow
                               text-xs px-2.5 py-1 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {comment && (
              <p className="text-sm text-engao-text bg-engao-bg rounded-lg p-3">{comment}</p>
            )}
            <p className="text-xs text-engao-sub">担当: {staffName}</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-engao-green text-white py-4 rounded-2xl text-base font-medium
                       disabled:opacity-60 active:bg-engao-green-dark transition-colors"
          >
            {saving ? '保存中...' : 'OK（保存する）'}
          </button>
        </div>
      </div>
    );
  }

  // ─── 入力画面 ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-engao-bg pb-10">
      <header className="bg-engao-green text-white px-4 py-4">
        <button onClick={() => router.back()} className="text-sm text-green-100 mb-1">← 利用者選択</button>
        <h1 className="text-lg font-bold">{patient.name}</h1>
        <p className="text-xs text-green-100 mt-0.5">担当: {staffName}</p>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* 異常なしで登録（ワンタップ確定） */}
        <button
          onClick={handleQuickSave}
          className="w-full bg-engao-green text-white py-4 rounded-2xl text-base font-bold
                     shadow active:bg-engao-green-dark transition-colors"
        >
          異常なしで登録
        </button>

        {/* 食事 */}
        <div className="bg-white rounded-2xl border border-engao-border p-4">
          <p className="text-xs font-semibold text-engao-sub mb-3">食事</p>
          <ScoreButtons options={MEAL_OPTIONS} value={meal} onChange={setMeal} negativeValues={MEAL_NEGATIVE} />
        </div>

        {/* 健康 */}
        <div className="bg-white rounded-2xl border border-engao-border p-4">
          <p className="text-xs font-semibold text-engao-sub mb-3">健康</p>
          <ScoreButtons options={HEALTH_OPTIONS} value={health} onChange={setHealth} negativeValues={HEALTH_NEGATIVE} />
        </div>

        {/* 排泄 */}
        <div className="bg-white rounded-2xl border border-engao-border p-4">
          <p className="text-xs font-semibold text-engao-sub mb-3">排泄</p>
          <ScoreButtons options={EXCRETION_OPTIONS} value={excretion} onChange={setExcretion} negativeValues={EXCRETION_NEGATIVE} />
        </div>

        {/* 水分 */}
        <div className="bg-white rounded-2xl border border-engao-border p-4">
          <p className="text-xs font-semibold text-engao-sub mb-3">水分</p>
          <ScoreButtons options={HYDRATION_OPTIONS} value={hydration} onChange={setHydration} negativeValues={HYDRATION_NEGATIVE} />
        </div>

        {/* タグ */}
        <div className="bg-white rounded-2xl border border-engao-border p-4">
          <p className="text-xs font-semibold text-engao-sub mb-3">タグ</p>
          <div className="flex flex-wrap gap-2">
            {CARE_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={[
                  'px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                  tags.includes(tag)
                    ? 'bg-engao-yellow text-white border-engao-yellow'
                    : 'bg-white text-engao-text border-engao-yellow hover:bg-engao-yellow-light',
                ].join(' ')}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* コメント */}
        <div className="bg-white rounded-2xl border border-engao-border p-4">
          <p className="text-xs font-semibold text-engao-sub mb-3">コメント</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="気になったことや申し送り事項があれば…"
            className="w-full border border-engao-border rounded-xl px-3 py-2.5 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-engao-green"
          />
        </div>

        {/* 確認へ */}
        <button
          onClick={() => setStep('confirm')}
          className="w-full bg-engao-green text-white py-4 rounded-2xl text-base font-medium
                     active:bg-engao-green-dark transition-colors"
        >
          確認画面へ
        </button>
      </div>
    </div>
  );
}
