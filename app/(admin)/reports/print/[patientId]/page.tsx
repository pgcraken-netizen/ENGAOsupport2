'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Patient } from '@/types/patient';
import { CareRecord, AlertLevel } from '@/types/record';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Printer, ArrowLeft } from 'lucide-react';

// 帳票表示用の状態変換（行政向け正式表記）
const ALERT_TO_DISPLAY: Record<AlertLevel, string> = {
  '正常': '正常',
  '観察': '観察',
  '注意': '注意',
  '警告': '警告',
};

const INTERNAL_TO_FORMAL: Record<string, string> = {
  '良好': '正常', '普通': '普通',
  'やや不調': '観察', '不調': '注意', '重不調': '警告',
  '完食': '完食', '8割': '8割', '半分': '半分', '少量': '少量', '拒否': '拒否',
  '正常': '正常', '不規則': '観察', '困難': '注意', 'なし': '警告',
  '十分': '十分', '少ない': '観察', 'わずか': '注意',
};

function toFormal(value: string | null | undefined): string {
  if (!value) return '—';
  return INTERNAL_TO_FORMAL[value] ?? value;
}

function PrintContent() {
  const { patientId } = useParams<{ patientId: string }>();
  const searchParams = useSearchParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const dateFrom = searchParams.get('from') ?? '';
  const dateTo = searchParams.get('to') ?? '';

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('patient_id', patientId);
    params.set('status', 'confirmed');
    params.set('input_mode', 'liff');
    params.set('limit', '31');
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    Promise.all([
      fetch(`/api/patients/${patientId}`).then(r => r.json()),
      fetch(`/api/records?${params}`).then(r => r.json()),
    ]).then(([patientData, recordData]) => {
      setPatient(patientData.data);
      setRecords((recordData.data ?? []).sort(
        (a: CareRecord, b: CareRecord) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      ));
    }).finally(() => setLoading(false));
  }, [patientId, dateFrom, dateTo]);

  if (loading) return <div className="p-8 text-center text-gray-400">読み込み中...</div>;
  if (!patient) return <div className="p-8 text-center text-gray-400">利用者が見つかりません</div>;

  const periodFrom = records.length > 0
    ? format(new Date(records[0].recorded_at), 'yyyy年M月d日', { locale: ja })
    : dateFrom
      ? format(new Date(dateFrom), 'yyyy年M月d日', { locale: ja })
      : '—';
  const periodTo = records.length > 0
    ? format(new Date(records[records.length - 1].recorded_at), 'yyyy年M月d日', { locale: ja })
    : dateTo
      ? format(new Date(dateTo), 'yyyy年M月d日', { locale: ja })
      : '—';

  const anomalyRecords = records.filter(r => r.alert_level && r.alert_level !== '正常');

  return (
    <div>
      {/* 印刷コントロール（画面のみ表示） */}
      <div className="no-print flex items-center gap-3 px-6 py-4 bg-engao-bg border-b border-engao-border">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-engao-sub text-sm hover:text-engao-text"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-engao-green text-white px-4 py-2 rounded-lg text-sm hover:bg-engao-green-dark transition-colors"
        >
          <Printer className="h-4 w-4" />
          PDF保存 / 印刷
        </button>
      </div>

      {/* A4帳票本体 */}
      <div ref={printRef} className="print-area bg-white mx-auto my-6 no-print:shadow-lg"
        style={{ width: '210mm', minHeight: '297mm', padding: '10mm', fontFamily: '"Yu Gothic", "游ゴシック", Meiryo, sans-serif', color: '#000' }}>

        {/* タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
          <h1 style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '2mm' }}>
            介護記録報告書（個別）
          </h1>
          <div style={{ width: '100%', height: '0.5mm', background: '#333' }} />
        </div>

        {/* 基本情報 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '10pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '25mm', padding: '1.5mm 2mm', fontWeight: 'bold' }}>利用者名</td>
              <td style={{ padding: '1.5mm 2mm', borderBottom: '0.5pt solid #ccc', minWidth: '60mm' }}>
                {patient.name}
                {patient.room_number ? `　（${patient.room_number}号室）` : ''}
                {patient.care_level ? `　要介護${patient.care_level}` : ''}
              </td>
              <td style={{ width: '15mm', padding: '1.5mm 2mm', fontWeight: 'bold', paddingLeft: '4mm' }}>期間</td>
              <td style={{ padding: '1.5mm 2mm', borderBottom: '0.5pt solid #ccc' }}>
                {periodFrom} ～ {periodTo}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ width: '100%', height: '0.3pt', background: '#ccc', marginBottom: '4mm' }} />

        {/* 記録表 */}
        {records.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '8.5pt' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'left', width: '18mm' }}>日付</th>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'center', width: '14mm' }}>食事</th>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'center', width: '14mm' }}>健康</th>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'center', width: '14mm' }}>排泄</th>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'center', width: '14mm' }}>水分</th>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'center', width: '14mm' }}>状態</th>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'left' }}>備考</th>
                <th style={{ border: '0.5pt solid #aaa', padding: '1.5mm 2mm', textAlign: 'center', width: '20mm' }}>記録者</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const alertLevel = r.alert_level as AlertLevel ?? '正常';
                const isAnomaly = alertLevel !== '正常';
                const rowBg = alertLevel === '警告' ? '#fff0f0' : alertLevel === '注意' ? '#fff8f0' : alertLevel === '観察' ? '#fffef0' : (idx % 2 === 0 ? '#fff' : '#fafafa');
                const tags = r.care_tags?.length ? r.care_tags.join('・') : '';
                const comment = r.comment ?? '';
                const remarks = [tags, comment].filter(Boolean).join('　');
                return (
                  <tr key={r.id} style={{ background: rowBg }}>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm' }}>
                      {format(new Date(r.recorded_at), 'M/d(EEE)', { locale: ja })}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm', textAlign: 'center' }}>
                      {toFormal(r.meal)}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm', textAlign: 'center' }}>
                      {toFormal(r.health)}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm', textAlign: 'center' }}>
                      {toFormal(r.excretion)}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm', textAlign: 'center' }}>
                      {toFormal(r.hydration)}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm', textAlign: 'center', fontWeight: isAnomaly ? 'bold' : 'normal' }}>
                      {ALERT_TO_DISPLAY[alertLevel]}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm', fontSize: '7.5pt' }}>
                      {remarks || ''}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '1.5mm 2mm', textAlign: 'center' }}>
                      {r.staff?.name ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#666', fontSize: '9pt', marginBottom: '6mm' }}>
            指定期間の記録がありません
          </p>
        )}

        {/* 特記事項 */}
        <div style={{ marginBottom: '8mm', border: '0.5pt solid #ccc', padding: '3mm' }}>
          <p style={{ fontWeight: 'bold', fontSize: '9pt', marginBottom: '2mm' }}>【特記事項】</p>
          {anomalyRecords.length > 0 ? (
            <ul style={{ listStyle: 'disc', paddingLeft: '5mm', fontSize: '8.5pt' }}>
              {anomalyRecords.map(r => (
                <li key={r.id} style={{ marginBottom: '1mm' }}>
                  {format(new Date(r.recorded_at), 'M/d', { locale: ja })}：{r.comment ?? `${r.alert_level}状態`}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '8.5pt', color: '#666' }}>特記事項なし</p>
          )}
          <div style={{ marginTop: '3mm' }}>
            {['', ''].map((_, i) => (
              <div key={i} style={{ borderBottom: '0.5pt solid #ccc', marginBottom: '4mm', height: '5mm' }} />
            ))}
          </div>
        </div>

        {/* 署名欄 */}
        <div style={{ marginBottom: '8mm', fontSize: '9pt' }}>
          <p>上記の通り、記録内容に相違ありません。</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20mm', marginTop: '5mm' }}>
            <div style={{ textAlign: 'center' }}>
              <p>記録責任者：</p>
              <div style={{ borderBottom: '0.5pt solid #333', width: '50mm', marginTop: '8mm' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p>確認者：</p>
              <div style={{ borderBottom: '0.5pt solid #333', width: '50mm', marginTop: '8mm' }} />
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: '0.5pt', background: '#333', marginBottom: '3mm' }} />

        {/* フッター：法人情報 */}
        <div style={{ fontSize: '8pt', color: '#444', lineHeight: '1.6' }}>
          <p style={{ fontWeight: 'bold' }}>一般社団法人えんがお</p>
          <p>代表：濱野将行</p>
          <p>〒324-0051 栃木県大田原市山の手1-9-10</p>
          <p>定休日：水曜日（土日営業）　☎ 0287-33-9110</p>
          <p>Twitter: https://x.com/engao2525　Instagram: https://www.instagram.com/engaogram/</p>
          <p>https://www.engawa-smile.org</p>
        </div>
      </div>
    </div>
  );
}

export default function PrintReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">読み込み中...</div>}>
      <PrintContent />
    </Suspense>
  );
}
