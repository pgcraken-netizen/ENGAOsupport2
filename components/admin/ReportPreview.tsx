'use client';

import { Badge } from '@/components/ui/badge';

interface ReportItem {
  patient_name: string;
  priority: 'normal' | 'attention' | 'urgent';
  text: string;
}

interface ReportPreviewProps {
  summary: string;
  items: ReportItem[];
  notes?: string | null;
  reportDate: string;
  shift: string;
}

const priorityConfig = {
  normal: { variant: 'secondary' as const, label: '通常' },
  attention: { variant: 'warning' as const, label: '注意' },
  urgent: { variant: 'destructive' as const, label: '緊急' },
};

const shiftLabel: Record<string, string> = {
  morning: '日勤',
  afternoon: '準夜勤',
  night: '夜勤',
  all: '全シフト',
};

export function ReportPreview({ summary, items, notes, reportDate, shift }: ReportPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 text-white rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-1">
          {reportDate} {shiftLabel[shift] ?? shift} 申し送り
        </div>
        <p className="text-sm font-medium">{summary}</p>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => {
          const config = priorityConfig[item.priority] ?? priorityConfig.normal;
          return (
            <div key={i} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">{item.patient_name}</span>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <p className="text-sm text-gray-700">{item.text}</p>
            </div>
          );
        })}
      </div>

      {notes && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">注記</p>
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
      )}
    </div>
  );
}
