'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportPreview } from '@/components/admin/ReportPreview';
import { todayString } from '@/lib/utils/dateUtils';
import { Patient } from '@/types/patient';
import { FileText, Download } from 'lucide-react';

type ShiftType = 'morning' | 'afternoon' | 'night' | 'all';

interface ReportData {
  id: string;
  report_date: string;
  shift: ShiftType;
  content: string;
  content_json: {
    summary: string;
    items: Array<{ patient_name: string; priority: 'normal' | 'attention' | 'urgent'; text: string }>;
    notes?: string | null;
  } | null;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [targetDate, setTargetDate] = useState(todayString());
  const [shift, setShift] = useState<ShiftType>('all');
  const [loading, setLoading] = useState(true);
  const [facilityId, setFacilityId] = useState('');

  // 帳票出力用
  const [patients, setPatients] = useState<Patient[]>([]);
  const [printPatientId, setPrintPatientId] = useState('');
  const [printFrom, setPrintFrom] = useState('');
  const [printTo, setPrintTo] = useState(todayString());

  useEffect(() => {
    fetch('/api/patients').then(r => r.json()).then(d => setPatients(d.data ?? []));
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleGenerate = async () => {
    let fid = facilityId;
    if (!fid) {
      const res = await fetch('/api/patients');
      const data = await res.json();
      fid = data.data?.[0]?.facility_id ?? '';
      setFacilityId(fid);
    }
    if (!fid) { alert('施設情報が見つかりません'); return; }

    setGenerating(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: fid, report_date: targetDate, shift }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReports();
        setSelectedReport(data.report);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!printPatientId) { alert('利用者を選択してください'); return; }
    const params = new URLSearchParams();
    if (printFrom) params.set('from', printFrom);
    if (printTo) params.set('to', printTo);
    window.open(`/reports/print/${printPatientId}?${params}`, '_blank');
  };

  const shiftOptions: { value: ShiftType; label: string }[] = [
    { value: 'all', label: '全シフト' },
    { value: 'morning', label: '日勤' },
    { value: 'afternoon', label: '準夜勤' },
    { value: 'night', label: '夜勤' },
  ];

  return (
    <div>
      <TopBar title="帳票・申し送り" />
      <div className="p-6 max-w-4xl space-y-4">

        {/* 帳票出力 */}
        <div className="bg-white rounded-xl border border-engao-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-engao-green" />
            <h3 className="text-sm font-bold text-engao-text">介護記録報告書（A4帳票）</h3>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-engao-sub block mb-1">利用者</label>
              <select
                value={printPatientId}
                onChange={e => setPrintPatientId(e.target.value)}
                className="border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
              >
                <option value="">選択してください</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-engao-sub block mb-1">開始日</label>
              <input
                type="date"
                value={printFrom}
                onChange={e => setPrintFrom(e.target.value)}
                className="border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
              />
            </div>
            <div>
              <label className="text-xs text-engao-sub block mb-1">終了日</label>
              <input
                type="date"
                value={printTo}
                onChange={e => setPrintTo(e.target.value)}
                className="border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
              />
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-engao-green text-white px-4 py-2 rounded-lg text-sm hover:bg-engao-green-dark transition-colors"
            >
              <Download className="h-4 w-4" />
              帳票プレビュー
            </button>
          </div>
          <p className="text-xs text-engao-sub mt-2">
            ※ プレビュー画面からブラウザの印刷機能（Ctrl+P）でPDF保存できます
          </p>
        </div>

        {/* AI申し送り生成 */}
        <div className="bg-white rounded-xl border border-engao-border p-5">
          <h3 className="text-sm font-bold text-engao-text mb-4">AI申し送り生成</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-engao-sub block mb-1">対象日</label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
              />
            </div>
            <div>
              <label className="text-xs text-engao-sub block mb-1">シフト</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value as ShiftType)}
                className="border border-engao-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-engao-green"
              >
                {shiftOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-engao-green hover:bg-engao-green-dark text-white"
            >
              {generating ? '生成中...' : 'AI生成'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-engao-border overflow-hidden">
            <div className="px-4 py-3 border-b border-engao-border">
              <h3 className="text-sm font-bold text-engao-text">過去の申し送り</h3>
            </div>
            <div className="p-2">
              {loading ? (
                <p className="text-sm text-engao-sub p-3">読み込み中...</p>
              ) : reports.length === 0 ? (
                <p className="text-sm text-engao-sub p-3">申し送りがありません</p>
              ) : (
                <div className="space-y-1">
                  {reports.map(report => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors ${
                        selectedReport?.id === report.id
                          ? 'bg-engao-green-light text-engao-green-dark'
                          : 'hover:bg-engao-bg text-engao-text'
                      }`}
                    >
                      <p className="font-medium">{report.report_date}</p>
                      <p className="text-xs text-engao-sub mt-0.5">
                        {report.shift === 'all' ? '全シフト' : report.shift}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl border border-engao-border overflow-hidden">
            <div className="px-4 py-3 border-b border-engao-border">
              <h3 className="text-sm font-bold text-engao-text">申し送り内容</h3>
            </div>
            <div className="p-4">
              {selectedReport?.content_json ? (
                <ReportPreview
                  summary={selectedReport.content_json.summary}
                  items={selectedReport.content_json.items}
                  notes={selectedReport.content_json.notes}
                  reportDate={selectedReport.report_date}
                  shift={selectedReport.shift}
                />
              ) : (
                <p className="text-sm text-engao-sub">
                  左から申し送りを選択するか、新しく生成してください
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
