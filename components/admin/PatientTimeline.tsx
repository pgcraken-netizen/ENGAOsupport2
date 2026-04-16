'use client';

import { CareRecord } from '@/types/record';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/utils/dateUtils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PatientTimelineProps {
  records: CareRecord[];
}

const conditionVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  良好: 'success',
  普通: 'warning',
  不良: 'destructive',
  要観察: 'secondary',
};

function groupByDate(records: CareRecord[]): Record<string, CareRecord[]> {
  return records.reduce<Record<string, CareRecord[]>>((acc, r) => {
    const date = format(new Date(r.recorded_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(r);
    return acc;
  }, {});
}

function dateLabel(dateStr: string): string {
  return format(new Date(dateStr), 'M月d日（E）', { locale: ja });
}

export function PatientTimeline({ records }: PatientTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">記録がありません</div>
    );
  }

  const grouped = groupByDate(records);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap px-2">
              {dateLabel(date)}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-2 pl-4 border-l-2 border-gray-100">
            {grouped[date].map((record) => (
              <div key={record.id} className="relative">
                {/* タイムラインドット */}
                <div className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-white border-2 border-gray-300" />

                <div className="bg-white border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                      {formatTime(record.recorded_at)}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {record.care_tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {record.condition && (
                          <Badge variant={conditionVariant[record.condition] ?? 'secondary'}>
                            {record.condition}
                          </Badge>
                        )}
                        {record.is_incident && (
                          <Badge variant="destructive">インシデント</Badge>
                        )}
                      </div>
                      {record.condition_detail && (
                        <p className="text-xs text-gray-600">{record.condition_detail}</p>
                      )}
                      <p className="text-xs text-gray-400 truncate">{record.original_text}</p>
                      {record.staff?.name && (
                        <p className="text-xs text-gray-400">担当: {record.staff.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
