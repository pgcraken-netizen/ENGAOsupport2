'use client';

import { CareRecord, AlertLevel } from '@/types/record';
import { formatTime } from '@/lib/utils/dateUtils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PatientTimelineProps {
  records: CareRecord[];
}

const alertColors: Record<AlertLevel, string> = {
  '正常': 'bg-engao-green-light text-engao-green-dark',
  '観察': 'bg-yellow-100 text-yellow-700',
  '注意': 'bg-orange-100 text-orange-700',
  '警告': 'bg-red-100 text-red-700',
};

const dotColors: Record<AlertLevel, string> = {
  '正常': 'border-engao-green',
  '観察': 'border-yellow-400',
  '注意': 'border-orange-400',
  '警告': 'border-red-500',
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
      <div className="text-center py-12 text-engao-sub text-sm">記録がありません</div>
    );
  }

  const grouped = groupByDate(records);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-engao-border" />
            <span className="text-xs font-medium text-engao-sub whitespace-nowrap px-2">
              {dateLabel(date)}
            </span>
            <div className="h-px flex-1 bg-engao-border" />
          </div>

          <div className="space-y-2 pl-4 border-l-2 border-engao-border">
            {grouped[date].map((record) => {
              const alertLevel = (record.alert_level ?? '正常') as AlertLevel;
              return (
                <div key={record.id} className="relative">
                  <div className={`absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-white border-2 ${dotColors[alertLevel]}`} />
                  <div className="bg-white border border-engao-border rounded-xl p-3 hover:border-engao-green transition-colors">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-engao-sub whitespace-nowrap mt-0.5">
                        {formatTime(record.recorded_at)}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* 5段階評価（LIFF） */}
                          {record.input_mode === 'liff' && (record.meal || record.health) && (
                            <div className="flex gap-1 flex-wrap">
                              {record.meal && (
                                <span className="text-xs bg-engao-bg text-engao-sub px-1.5 py-0.5 rounded">
                                  食{record.meal}
                                </span>
                              )}
                              {record.health && (
                                <span className="text-xs bg-engao-bg text-engao-sub px-1.5 py-0.5 rounded">
                                  健{record.health}
                                </span>
                              )}
                            </div>
                          )}
                          {alertLevel !== '正常' && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${alertColors[alertLevel]}`}>
                              {alertLevel}
                            </span>
                          )}
                          {record.care_tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-engao-orange-light text-engao-warn text-xs px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {record.is_incident && (
                            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold">
                              インシデント
                            </span>
                          )}
                        </div>
                        {(record.comment || record.condition_detail) && (
                          <p className="text-xs text-engao-sub">{record.comment ?? record.condition_detail}</p>
                        )}
                        {record.original_text && !record.meal && (
                          <p className="text-xs text-engao-sub truncate">{record.original_text}</p>
                        )}
                        {record.staff?.name && (
                          <p className="text-xs text-engao-sub">担当: {record.staff.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
