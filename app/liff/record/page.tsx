'use client';

import { useEffect, useState, useCallback } from 'react';

type Step = 'loading' | 'patient-select' | 'score-input' | 'success' | 'error';

interface Patient {
  id: string;
  name: string;
  room_number: string | null;
}

interface Scores {
  meal:      string;
  health:    string;
  excretion: string;
  hydration: string;
}

const SCORE_ROWS = [
  { icon: '🍽', label: '食事',   key: 'meal' as const,      options: ['完食','8割','半分','少量','拒否'],        negatives: ['少量','拒否'] },
  { icon: '💊', label: '健康',   key: 'health' as const,    options: ['良好','普通','不良','発熱','要受診'],      negatives: ['不良','発熱','要受診'] },
  { icon: '🚽', label: '排泄',   key: 'excretion' as const, options: ['正常','普通','軟便','下痢','なし'],        negatives: ['軟便','下痢','なし'] },
  { icon: '💧', label: '水分',   key: 'hydration' as const, options: ['十分','普通','少量','拒否','未確認'],      negatives: ['少量','拒否'] },
];

const DEFAULT_SCORES: Scores = { meal:'完食', health:'良好', excretion:'正常', hydration:'十分' };

const GREEN = '#6BA368';
const RED   = '#E53E3E';
const GRAY  = '#888888';

function hasWarning(s: Scores) {
  return ['少量','拒否'].includes(s.meal) ||
    ['不良','発熱','要受診'].includes(s.health) ||
    ['軟便','下痢','なし'].includes(s.excretion) ||
    ['少量','拒否'].includes(s.hydration);
}

function todayLabel() {
  const d   = new Date();
  const dow = ['日','月','火','水','木','金','土'][d.getDay()];
  return `${d.getMonth()+1}月${d.getDate()}日（${dow}）`;
}

export default function LiffRecordPage() {
  const [step,            setStep]            = useState<Step>('loading');
  const [lineUserId,      setLineUserId]      = useState<string | null>(null);
  const [displayName,     setDisplayName]     = useState('');
  const [facilityId,      setFacilityId]      = useState<string | null>(null);
  const [staffId,         setStaffId]         = useState<string | null>(null);
  const [patients,        setPatients]        = useState<Patient[]>([]);
  const [recordedToday,   setRecordedToday]   = useState<Set<string>>(new Set());
  const [searchText,      setSearchText]      = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [scores,          setScores]          = useState<Scores>(DEFAULT_SCORES);
  const [isFromPrev,      setIsFromPrev]      = useState(false);
  const [comment,         setComment]         = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [errorMsg,        setErrorMsg]        = useState('');
  const [savedAction,     setSavedAction]     = useState<'created'|'updated'>('created');

  // ── LIFF 初期化 ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setErrorMsg('LIFF IDが設定されていません。管理者に連絡してください。');
          setStep('error'); return;
        }
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) { liff.login(); return; }

        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
        setDisplayName(profile.displayName);

        const res  = await fetch(`/api/liff/init?userId=${encodeURIComponent(profile.userId)}`);
        if (!res.ok) throw new Error('init API failed');
        const data = await res.json();

        if (!data.facilityId) {
          setErrorMsg('施設情報が見つかりません。\nLINEアカウントが施設に登録されていない可能性があります。\n管理者に連絡してください。');
          setStep('error'); return;
        }
        setFacilityId(data.facilityId);
        setStaffId(data.staffId ?? null);
        if (data.staffName) setDisplayName(data.staffName);
        setPatients(data.patients ?? []);
        setRecordedToday(new Set(Array.from(data.recordedToday ?? [])));
        setStep('patient-select');
      } catch (err) {
        console.error('LIFF init error:', err);
        setErrorMsg('初期化に失敗しました。LINEアプリから再度お試しください。');
        setStep('error');
      }
    };
    init();
  }, []);

  // ── 利用者選択 ─────────────────────────────────────────────────
  const handleSelectPatient = useCallback(async (patient: Patient) => {
    setSelectedPatient(patient);
    setScores(DEFAULT_SCORES);
    setComment('');
    setIsFromPrev(false);
    try {
      const res  = await fetch(`/api/liff/last-record?patientId=${patient.id}&facilityId=${facilityId}`);
      const data = await res.json();
      if (data.record) {
        setScores({
          meal:      data.record.meal      ?? DEFAULT_SCORES.meal,
          health:    data.record.health    ?? DEFAULT_SCORES.health,
          excretion: data.record.excretion ?? DEFAULT_SCORES.excretion,
          hydration: data.record.hydration ?? DEFAULT_SCORES.hydration,
        });
        setIsFromPrev(true);
      }
    } catch { /* デフォルト値のまま */ }
    setStep('score-input');
  }, [facilityId]);

  // ── 記録送信 ───────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedPatient || !lineUserId || !facilityId) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/liff/record', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, displayName, facilityId, staffId, patientId: selectedPatient.id, ...scores, comment: comment.trim() || null }),
      });
      if (!res.ok) throw new Error('submit failed');
      const data = await res.json();
      setSavedAction(data.action ?? 'created');
      // 本日済みバッジを更新
      setRecordedToday(prev => { const next = new Set(Array.from(prev)); next.add(selectedPatient.id); return next; });
      setStep('success');
    } catch {
      setErrorMsg('保存に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }, [selectedPatient, lineUserId, facilityId, staffId, displayName, scores, comment]);

  const filtered = patients.filter(p =>
    p.name.includes(searchText) || (p.room_number ?? '').includes(searchText)
  );

  // ── 共通スタイル ──────────────────────────────────────────────
  const headerStyle = (warn: boolean): React.CSSProperties => ({
    background: warn ? RED : GREEN, color: '#fff',
    padding: '14px 16px', fontSize: '16px', fontWeight: 'bold',
    display: 'flex', alignItems: 'center', gap: '8px',
  });
  const cardStyle: React.CSSProperties = {
    background: '#ffffff', borderRadius: '12px', padding: '16px',
    margin: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  // ── Loading ────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:'16px' }}>
      <div style={{ width:40, height:40, border:`4px solid ${GREEN}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#666', fontSize:'14px' }}>読み込み中...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────
  if (step === 'error') return (
    <div style={{ padding:'32px 16px', textAlign:'center' }}>
      <div style={{ fontSize:'40px', marginBottom:'16px' }}>⚠️</div>
      <p style={{ color:'#666', fontSize:'14px', whiteSpace:'pre-line', lineHeight:'1.6' }}>{errorMsg}</p>
    </div>
  );

  // ── Success ───────────────────────────────────────────────────
  if (step === 'success') return (
    <div>
      <div style={headerStyle(false)}><span>✅</span> 記録完了</div>
      <div style={{ ...cardStyle, textAlign:'center', padding:'32px 16px' }}>
        <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
        <p style={{ fontSize:'18px', fontWeight:'bold', marginBottom:'8px' }}>
          {selectedPatient?.name}さんの記録を{savedAction === 'updated' ? '更新' : '保存'}しました
        </p>
        <p style={{ color:GRAY, fontSize:'13px', marginBottom:'24px' }}>{todayLabel()}</p>
        <div style={{ background:'#f8f8f8', borderRadius:'8px', padding:'12px', marginBottom:'24px', textAlign:'left', fontSize:'14px', lineHeight:'2' }}>
          <div>🍽 食事: <strong>{scores.meal}</strong></div>
          <div>💊 健康: <strong>{scores.health}</strong></div>
          <div>🚽 排泄: <strong>{scores.excretion}</strong></div>
          <div>💧 水分: <strong>{scores.hydration}</strong></div>
          {comment && <div>📝 <strong>{comment}</strong></div>}
        </div>
        <button onClick={() => { setSearchText(''); setSelectedPatient(null); setScores(DEFAULT_SCORES); setComment(''); setIsFromPrev(false); setErrorMsg(''); setStep('patient-select'); }}
          style={{ width:'100%', padding:'14px', background:GREEN, color:'#fff', border:'none', borderRadius:'10px', fontSize:'16px', fontWeight:'bold', marginBottom:'10px', cursor:'pointer' }}>
          続けて記録する
        </button>
        <button onClick={async () => { try { const liff = (await import('@line/liff')).default; liff.closeWindow(); } catch { window.close(); } }}
          style={{ width:'100%', padding:'14px', background:'#f0f0f0', color:'#444', border:'none', borderRadius:'10px', fontSize:'15px', cursor:'pointer' }}>
          閉じる
        </button>
      </div>
    </div>
  );

  // ── 利用者選択 ────────────────────────────────────────────────
  if (step === 'patient-select') {
    const recorded   = filtered.filter(p => recordedToday.has(p.id));
    const unrecorded = filtered.filter(p => !recordedToday.has(p.id));

    return (
      <div>
        <div style={headerStyle(false)}>
          <span>📋</span>
          <div>
            <div>健康記録</div>
            <div style={{ fontSize:'12px', fontWeight:'normal', opacity:0.9 }}>{todayLabel()}　担当: {displayName}</div>
          </div>
          {/* 記録進捗 */}
          <div style={{ marginLeft:'auto', background:'rgba(255,255,255,0.25)', borderRadius:'8px', padding:'4px 10px', fontSize:'13px', fontWeight:'bold' }}>
            {recorded.length}/{patients.length}
          </div>
        </div>

        <div style={{ padding:'12px 12px 4px' }}>
          <input type="text" placeholder="🔍 名前・部屋番号で検索" value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width:'100%', padding:'10px 14px', border:'1px solid #ddd', borderRadius:'10px', fontSize:'15px', boxSizing:'border-box', outline:'none' }} />
        </div>

        <div style={{ padding:'4px 12px 20px' }}>
          {/* 未記録 */}
          {unrecorded.length > 0 && (
            <>
              {searchText === '' && <div style={{ fontSize:'12px', color:GRAY, margin:'8px 4px 4px', fontWeight:'bold' }}>未記録 ({unrecorded.length}名)</div>}
              {unrecorded.map(patient => (
                <button key={patient.id} onClick={() => handleSelectPatient(patient)}
                  style={{ display:'flex', alignItems:'center', width:'100%', padding:'14px 16px', marginTop:'8px',
                    background:'#ffffff', border:'1px solid #e8e8e8', borderRadius:'10px', cursor:'pointer',
                    textAlign:'left', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                  {patient.room_number && (
                    <span style={{ background:'#eef7ee', color:GREEN, borderRadius:'6px', padding:'2px 8px', fontSize:'12px', marginRight:'10px', whiteSpace:'nowrap' }}>
                      {patient.room_number}号室
                    </span>
                  )}
                  <span style={{ fontSize:'17px', fontWeight:'bold' }}>{patient.name}</span>
                  <span style={{ marginLeft:'auto', color:'#bbb', fontSize:'18px' }}>›</span>
                </button>
              ))}
            </>
          )}

          {/* 記録済み */}
          {recorded.length > 0 && (
            <>
              {searchText === '' && <div style={{ fontSize:'12px', color:GRAY, margin:'16px 4px 4px', fontWeight:'bold' }}>記録済み ✅ ({recorded.length}名)</div>}
              {recorded.map(patient => (
                <button key={patient.id} onClick={() => handleSelectPatient(patient)}
                  style={{ display:'flex', alignItems:'center', width:'100%', padding:'14px 16px', marginTop:'8px',
                    background:'#f8fdf8', border:'1px solid #c8e6c8', borderRadius:'10px', cursor:'pointer',
                    textAlign:'left', opacity:0.85 }}>
                  {patient.room_number && (
                    <span style={{ background:'#eef7ee', color:GREEN, borderRadius:'6px', padding:'2px 8px', fontSize:'12px', marginRight:'10px', whiteSpace:'nowrap' }}>
                      {patient.room_number}号室
                    </span>
                  )}
                  <span style={{ fontSize:'17px', fontWeight:'bold' }}>{patient.name}</span>
                  <span style={{ marginLeft:'auto', fontSize:'16px' }}>✅</span>
                </button>
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <p style={{ textAlign:'center', color:GRAY, padding:'32px', fontSize:'14px' }}>利用者が見つかりません</p>
          )}
        </div>
      </div>
    );
  }

  // ── スコア入力 ────────────────────────────────────────────────
  const warn = hasWarning(scores);
  return (
    <div>
      <div style={headerStyle(warn)}>
        <button onClick={() => setStep('patient-select')}
          style={{ background:'none', border:'none', color:'#fff', fontSize:'20px', cursor:'pointer', padding:'0 8px 0 0', lineHeight:1 }}>‹</button>
        <div>
          <div>{selectedPatient?.name}さん</div>
          <div style={{ fontSize:'12px', fontWeight:'normal', opacity:0.9 }}>
            {todayLabel()}　{recordedToday.has(selectedPatient?.id ?? '') ? '本日記録済み（上書き）' : isFromPrev ? '前回記録コピー' : '標準テンプレート'}
          </div>
        </div>
      </div>

      {/* スコア入力 */}
      <div style={cardStyle}>
        {SCORE_ROWS.map(row => (
          <div key={row.key} style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'13px', fontWeight:'bold', color:'#444', marginBottom:'6px' }}>{row.icon} {row.label}</div>
            <div style={{ display:'flex', gap:'5px' }}>
              {row.options.map(opt => {
                const isSelected = scores[row.key] === opt;
                const isNeg      = (row.negatives as string[]).includes(opt);
                return (
                  <button key={opt} onClick={() => setScores(prev => ({ ...prev, [row.key]: opt }))}
                    style={{ flex:1, padding:'7px 2px', fontSize:'12px',
                      border:`2px solid ${isSelected ? (isNeg ? RED : GREEN) : '#ddd'}`,
                      borderRadius:'8px', background:isSelected ? (isNeg ? RED : GREEN) : '#fafafa',
                      color:isSelected ? '#fff' : '#555', fontWeight:isSelected ? 'bold' : 'normal',
                      cursor:'pointer', transition:'all 0.15s' }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* コメント */}
      <div style={{ ...cardStyle, marginTop:0 }}>
        <div style={{ fontSize:'13px', fontWeight:'bold', color:'#444', marginBottom:'6px' }}>📝 特記事項（任意）</div>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="体調の変化、申し送り事項など..."
          rows={3}
          style={{ width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', resize:'vertical', outline:'none', fontFamily:'sans-serif' }} />
      </div>

      {/* 送信 */}
      <div style={{ padding:'4px 12px 32px' }}>
        {errorMsg && <p style={{ color:RED, fontSize:'13px', marginBottom:'8px', textAlign:'center' }}>{errorMsg}</p>}
        <button onClick={handleSubmit} disabled={submitting}
          style={{ width:'100%', padding:'16px', background:submitting ? GRAY : (warn ? RED : GREEN),
            color:'#fff', border:'none', borderRadius:'12px', fontSize:'17px', fontWeight:'bold',
            cursor:submitting ? 'not-allowed' : 'pointer', boxShadow:'0 3px 10px rgba(0,0,0,0.15)', transition:'background 0.2s' }}>
          {submitting ? '保存中...' : (warn ? '⚠️ この内容で記録する' : '✅ 記録する')}
        </button>
      </div>
    </div>
  );
}
