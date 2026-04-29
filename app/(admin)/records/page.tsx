'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useRecords } from '@/hooks/useRecords';
import { CareRecord, AlertLevel } from '@/types/record';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { ChevronRight, Download } from 'lucide-react';

type StatusFilter = 'all' | 'draft' | 'confirmed';
type InputModeFilter = 'all' | 'liff' | 'line_bot';

const ALERT_COLORS: Record<AlertLevel, string> = {
  '正常': 'bg-engao-green-light text-engao-green-dark',
  '観察': 'bg-yellow-100 text-yellow-700',
  '注意': 'bg-orange-100 text-orange-700',
  '警告': 'bg-red-100 text-red-700',
};

function RatingCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-engao-sub text-xs">—</span>;
  const bad = ['少量', '拒否', '不調', '重不調', '困難', 'なし', 'わずか'];
  const warn = ['半分', 'やや不調', '不規則', '少ない'];
  const cls = bad.includes(value)
    ? 'text-engao-danger font-bold'
    : warn.includes(value)
      ? 'text-engao-warn font-medium'
      : 'text-engao-green-dark';
  return <span className={`text-xs ${cls}`}>{value}</span>;
}

export default function RecordsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<InputModeFilter>('all');
  const [alertFilter, setAlertFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { records, loading, refetch, confirmRecord } = useRecords({
    status: statusFilter === 'all' ? undefined : statusFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 100,
  });

  // クライアントサイドでさらにフィルター
  const filtered = records.filter(r => {
    if (modeFilter !== 'all' && r.input_mode !== modeFilter) return false;
    if (alertFilter && r.alert_level !== alertFilter) return false;
    return true;
  });

  const handleConfirm = (id: string) => {
    const record = records.find(r => r.id === id);
    confirmRecord(id, record?.patient_candidates?.[0]?.id);
  };

  const handleCsvExport = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (modeFilter !== 'all') params.set('input_mode', modeFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('format', 'csv');
    window.open(`/api/records/export?${params}`, '_blank');
  };

  const statusBtnCls = (s: StatusFilter) =>
    `px-3 py-1.5 text-sm rounded-lg border transition-colors ${
      statusFilter === s
        ? 'bg-engao-green text-white border-engao-green'
        : 'bg-white text-engao-sub border-engao-border hover:bg-engao-bg'
    }`;

  const modeBtnCls = (m: InputModeFilter) =>
    `px-3 py-1.5 text-sm rounded-lg border transition-colors ${
      modeFilter === m
        ? 'bg-engao-green text-white border-engao-green'
        : 'bg-white text-engao-sub border-engao-border hover:bg-engao-bg'
    }`;

  return (
    <div>
      <TopBar title="記録一覧" />
      <div className="p-6 space-y-4 max-w-6xl">

        {/* フィルターバー */}
        <div className="bg-white rounded-xl border border-engao-border p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* ステータス */}
            <div className="flex gap-1">
              <button className={statusBtnCls('all')} onClick={() => setStatusFilter('all')}>全て</button>
              <button className={statusBtnCls('draft')} onClick={() => setStatusFilter('draft')}>未確定</button>
              <button className={statusBtnCls('confirmed')} onClick={() => setStatusFilter('confirmed')}>確定済</button>
            </div>

            {/* 入力モード */}
            <div className="flex gap-1">
              <button className={modeBtnCls('all')} onClick={() => setModeFilter('all')}>全モード</button>
              <button className={modeBtnCls('liff')} onClick={() => setModeFilter('liff')}>LIFF</button>
              <button className={modeBtnCls('line_bot')} onClick={() => setModeFilter('line_bot')}>LINEBot</button>
            </div>

            {/* アラートレベル */}
            <select
              value={alertFilter}
              onChange={e => setAlertFilter(e.target.value)}
              className="border border-engao-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
            >
              <option value="">アラート: 全て</option>
              <option value="警告">警告</option>
              <option value="注意">注意</option>
              <option value="観察">観察</option>
              <option value="正常">正常</option>
            </select>

            {/* 日付 */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-engao-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
              />
              <span className="text-engao-sub text-sm">〜</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-engao-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
              />
            </div>

            <button
              onClick={refetch}
              className="px-4 py-1.5 text-sm border border-engao-border rounded-lg hover:bg-engao-bg transition-colors text-engao-sub"
            >
              検索
            </button>

            <button
              onClick={handleCsvExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-engao-border rounded-lg hover:bg-engao-bg transition-colors text-engao-sub ml-auto"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          </div>
          <p className="text-xs text-engao-sub mt-2">{filtered.length}件</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-engao-sub text-sm">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-engao-sub text-sm">記録がありません</div>
        ) : (
          <>
            {/* デスクトップ: テーブル */}
            <div className="hidden md:block bg-white rounded-xl border border-engao-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-engao-bg border-b border-engao-border">
                    <th className="text-left px-4 py-3 text-xs text-engao-sub font-medium">日時</th>
                    <th className="text-left px-3 py-3 text-xs text-engao-sub font-medium">利用者</th>
                    <th className="text-left px-3 py-3 text-xs text-engao-sub font-medium">記録者</th>
                    <th className="text-center px-2 py-3 text-xs text-engao-sub font-medium">食事</th>
                    <th className="text-center px-2 py-3 text-xs text-engao-sub font-medium">健康</th>
                    <th className="text-center px-2 py-3 text-xs text-engao-sub font-medium">排泄</th>
                    <th className="text-center px-2 py-3 text-xs text-engao-sub font-medium">水分</th>
                    <th className="text-center px-3 py-3 text-xs text-engao-sub font-medium">状態</th>
                    <th className="text-left px-3 py-3 text-xs text-engao-sub font-medium">タグ</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-engao-border">
                  {filtered.map(record => {
                    const alertLevel = (record.alert_level ?? '正常') as AlertLevel;
                    const patientName =
                      record.patient?.name ??
                      record.patient_candidates?.[0]?.name ??
                      '未設定';
                    return (
                      <tr key={record.id} className="hover:bg-engao-bg/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-engao-sub whitespace-nowrap">
                          {format(new Date(record.recorded_at), 'M/d HH:mm', { locale: ja })}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-engao-text">{patientName}</span>
                          {record.patient?.room_number && (
                            <span className="text-xs text-engao-sub ml-1">{record.patient.room_number}号室</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-engao-sub whitespace-nowrap">
                          {record.staff?.name ?? record.line_display_name ?? '—'}
                        </td>
                        <td className="px-2 py-3 text-center"><RatingCell value={record.meal} /></td>
                        <td className="px-2 py-3 text-center"><RatingCell value={record.health} /></td>
                        <td className="px-2 py-3 text-center"><RatingCell value={record.excretion} /></td>
                        <td className="px-2 py-3 text-center"><RatingCell value={record.hydration} /></td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ALERT_COLORS[alertLevel]}`}>
                            {alertLevel}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {record.care_tags.slice(0, 2).map(tag => (
                              <span key={tag} className="bg-engao-orange-light text-engao-warn text-xs px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                            {record.care_tags.length > 2 && (
                              <span className="text-xs text-engao-sub">+{record.care_tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {record.status === 'draft' && (
                              <button
                                onClick={() => handleConfirm(record.id)}
                                className="text-xs bg-engao-green text-white px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-engao-green-dark transition-colors"
                              >
                                確定
                              </button>
                            )}
                            <Link href={`/records/${record.id}`}>
                              <ChevronRight className="h-4 w-4 text-engao-sub hover:text-engao-text" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* モバイル: カード */}
            <div className="md:hidden space-y-2">
              {filtered.map(record => {
                const alertLevel = (record.alert_level ?? '正常') as AlertLevel;
                const patientName =
                  record.patient?.name ??
                  record.patient_candidates?.[0]?.name ??
                  '未設定';
                return (
                  <Link key={record.id} href={`/records/${record.id}`}>
                    <div className="bg-white rounded-xl border border-engao-border px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-engao-text">{patientName}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ALERT_COLORS[alertLevel]}`}>
                            {alertLevel}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-engao-sub">
                          <span>{format(new Date(record.recorded_at), 'M/d HH:mm', { locale: ja })}</span>
                          <span>{record.staff?.name ?? '—'}</span>
                        </div>
                        {(record.meal || record.health) && (
                          <div className="flex gap-2 mt-1">
                            {record.meal && <RatingCell value={record.meal} />}
                            {record.health && <span className="text-xs text-engao-sub">/</span>}
                            {record.health && <RatingCell value={record.health} />}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-engao-sub flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
