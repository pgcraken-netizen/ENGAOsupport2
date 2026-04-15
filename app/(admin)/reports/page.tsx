'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportPreview } from '@/components/admin/ReportPreview';
import { todayString } from '@/lib/utils/dateUtils';

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

  // 施設ID取得
  useEffect(() => {
    fetch('/api/patients?limit=1')
      .then((r) => r.json())
      .then(() => {
        // 実際は認証から取得するが、ここでは最初の施設を使用
      });
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

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    if (!facilityId) {
      // 施設IDが未設定の場合は最初の施設を取得
      const res = await fetch('/api/patients');
      const data = await res.json();
      if (!data.data?.[0]?.facility_id) {
        alert('施設情報が見つかりません。利用者データを登録してください。');
        return;
      }
      const fid = data.data[0].facility_id;
      setFacilityId(fid);
      await generateReport(fid);
    } else {
      await generateReport(facilityId);
    }
  };

  const generateReport = async (fid: string) => {
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

  const shiftOptions: { value: ShiftType; label: string }[] = [
    { value: 'all', label: '全シフト' },
    { value: 'morning', label: '日勤' },
    { value: 'afternoon', label: '準夜勤' },
    { value: 'night', label: '夜勤' },
  ];

  return (
    <div>
      <TopBar title="申し送り" />
      <div className="p-6 max-w-4xl space-y-4">
        {/* 生成フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>申し送り生成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">対象日</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">シフト</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftType)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                >
                  {shiftOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? '生成中...' : 'AI生成'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 申し送り一覧 */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>過去の申し送り</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-400">読み込み中...</p>
              ) : reports.length === 0 ? (
                <p className="text-sm text-gray-400">申し送りがありません</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                        selectedReport?.id === report.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <p className="font-medium">{report.report_date}</p>
                      <p className="text-xs text-gray-400">
                        {report.shift === 'all' ? '全シフト' : report.shift}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 申し送りプレビュー */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>申し送り内容</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedReport?.content_json ? (
                <ReportPreview
                  summary={selectedReport.content_json.summary}
                  items={selectedReport.content_json.items}
                  notes={selectedReport.content_json.notes}
                  reportDate={selectedReport.report_date}
                  shift={selectedReport.shift}
                />
              ) : (
                <p className="text-sm text-gray-400">
                  左から申し送りを選択するか、新しく生成してください
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
