'use client';

import Link from 'next/link';
import { CareRecord, MEAL_NEGATIVE, HEALTH_NEGATIVE, EXCRETION_NEGATIVE, HYDRATION_NEGATIVE } from '@/types/record';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/dateUtils';
import { CheckCircle, Edit2, ExternalLink, Trash2 } from 'lucide-react';

interface RecordTableProps {
  records: CareRecord[];
  onConfirm?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusVariant: Record<string, 'default' | 'warning' | 'destructive'> = {
  draft: 'warning', confirmed: 'default', rejected: 'destructive',
};
const statusLabel: Record<string, string> = {
  draft: '未確定', confirmed: '確定済', rejected: '却下',
};

function ScorePill({ value, negatives }: { value: string | null | undefined; negatives: readonly string[] }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  const isNeg = negatives.includes(value);
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
      isNeg ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
    }`}>{value}</span>
  );
}

export function RecordTable({ records, onConfirm, onEdit, onDelete }: RecordTableProps) {
  if (records.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">記録がありません</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">日時</th>
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">利用者</th>
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">担当</th>
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">食事</th>
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">健康</th>
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">排泄</th>
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">水分</th>
            <th className="pb-3 pr-3 font-medium text-gray-500">タグ</th>
            <th className="pb-3 pr-3 font-medium text-gray-500 whitespace-nowrap">状態</th>
            <th className="pb-3 font-medium text-gray-500 whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {records.map(record => {
            const patientName =
              record.patient?.name ??
              (record.patient_candidates as Array<{ name: string }>)?.[0]?.name ??
              '未設定';
            return (
              <tr key={record.id} className="hover:bg-gray-50 group">
                <td className="py-3 pr-3 text-gray-500 whitespace-nowrap text-xs">
                  {formatDateTime(record.recorded_at)}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-900">{patientName}</span>
                    {record.patient?.room_number && (
                      <span className="text-xs text-gray-400">{record.patient.room_number}号室</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-3 text-gray-600 whitespace-nowrap text-xs">
                  {record.staff?.name ?? record.line_display_name ?? '—'}
                </td>
                <td className="py-3 pr-3"><ScorePill value={record.meal}      negatives={MEAL_NEGATIVE} /></td>
                <td className="py-3 pr-3"><ScorePill value={record.health}    negatives={HEALTH_NEGATIVE} /></td>
                <td className="py-3 pr-3"><ScorePill value={record.excretion} negatives={EXCRETION_NEGATIVE} /></td>
                <td className="py-3 pr-3"><ScorePill value={record.hydration} negatives={HYDRATION_NEGATIVE} /></td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-1 max-w-[120px]">
                    {record.care_tags.slice(0, 2).map(tag => (
                      <span key={tag} className="bg-amber-50 text-amber-700 text-xs px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {record.care_tags.length > 2 && (
                      <span className="text-xs text-gray-400">+{record.care_tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <Badge variant={statusVariant[record.status] ?? 'secondary'}>
                    {statusLabel[record.status]}
                  </Badge>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/records/${record.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {record.status === 'draft' && (
                      <>
                        {onEdit && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(record.id)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onConfirm && (
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onConfirm(record.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" />確定
                          </Button>
                        )}
                      </>
                    )}
                    {onDelete && (
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => onDelete(record.id)}
                        title="削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
