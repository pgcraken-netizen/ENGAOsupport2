'use client';

import { CareRecord } from '@/types/record';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/dateUtils';
import { CheckCircle, Edit2 } from 'lucide-react';

interface RecordCardProps {
  record: CareRecord;
  onConfirm?: (id: string) => void;
  onEdit?: (id: string) => void;
  compact?: boolean;
}

const conditionVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  良好: 'success',
  普通: 'warning',
  不良: 'destructive',
  要観察: 'secondary',
};

const statusVariant: Record<string, 'default' | 'warning' | 'destructive'> = {
  draft: 'warning',
  confirmed: 'default',
  rejected: 'destructive',
};

const statusLabel: Record<string, string> = {
  draft: '未確定',
  confirmed: '確定済',
  rejected: '却下',
};

export function RecordCard({ record, onConfirm, onEdit, compact = false }: RecordCardProps) {
  const patientName = record.patient?.name
    ?? (record.patient_candidates as Array<{name:string}>)?.[0]?.name
    ?? '利用者未設定';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{patientName}</span>
            {record.condition && (
              <Badge variant={conditionVariant[record.condition] ?? 'secondary'}>
                {record.condition}
              </Badge>
            )}
            <Badge variant={statusVariant[record.status] ?? 'secondary'}>
              {statusLabel[record.status]}
            </Badge>
            {record.is_incident && (
              <Badge variant="destructive">インシデント</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(record.recorded_at)}</p>
        </div>
        {!compact && record.status === 'draft' && (
          <div className="flex gap-1.5 flex-shrink-0">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(record.id)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                修正
              </Button>
            )}
            {onConfirm && (
              <Button size="sm" onClick={() => onConfirm(record.id)}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                確定
              </Button>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <>
          {record.care_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {record.care_tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {record.condition_detail && (
            <p className="text-sm text-gray-600">{record.condition_detail}</p>
          )}
          <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded truncate">
            {record.original_text}
          </p>
          {record.staff?.name && (
            <p className="text-xs text-gray-500">担当: {record.staff.name}</p>
          )}
        </>
      )}
    </div>
  );
}
