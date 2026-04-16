'use client';

import Link from 'next/link';
import { CareRecord } from '@/types/record';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/dateUtils';
import { getConfidenceLabel, getConfidenceColor } from '@/lib/utils/confidenceLabel';
import { CheckCircle, Edit2, ExternalLink } from 'lucide-react';

interface RecordTableProps {
  records: CareRecord[];
  onConfirm?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const conditionVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  良好: 'success',
  普通: 'warning',
  不良: 'destructive',
  要観察: 'secondary',
};

export function RecordTable({ records, onConfirm, onEdit }: RecordTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">記録がありません</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">日時</th>
            <th className="pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">利用者</th>
            <th className="pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">担当</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">ケア内容</th>
            <th className="pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">状態</th>
            <th className="pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">精度</th>
            <th className="pb-3 font-medium text-gray-500 whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {records.map((record) => {
            const patientName =
              record.patient?.name ??
              (record.patient_candidates as Array<{ name: string }>)?.[0]?.name ??
              '未設定';

            return (
              <tr key={record.id} className="hover:bg-gray-50 group">
                <td className="py-3 pr-4 text-gray-500 whitespace-nowrap text-xs">
                  {formatDateTime(record.recorded_at)}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">{patientName}</span>
                    {record.patient?.room_number && (
                      <span className="text-xs text-gray-400">{record.patient.room_number}号室</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                  {record.staff?.name ?? record.line_display_name ?? '—'}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {record.care_tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {record.care_tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{record.care_tags.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  {record.condition ? (
                    <Badge variant={conditionVariant[record.condition] ?? 'secondary'}>
                      {record.condition}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(record.confidence)}`}>
                    {getConfidenceLabel(record.confidence)}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/records/${record.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {record.status === 'draft' && (
                      <>
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => onEdit(record.id)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onConfirm && (
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onConfirm(record.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            確定
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
