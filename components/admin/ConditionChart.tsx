'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { CareRecord } from '@/types/record';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ConditionChartProps {
  records: CareRecord[];
}

const conditionScore: Record<string, number> = {
  良好: 3,
  普通: 2,
  要観察: 1,
  不良: 0,
};

const scoreLabel: Record<number, string> = {
  3: '良好',
  2: '普通',
  1: '要観察',
  0: '不良',
};

export function ConditionChart({ records }: ConditionChartProps) {
  const chartData = records
    .filter((r) => r.condition)
    .slice(0, 14)
    .reverse()
    .map((r) => ({
      date: format(new Date(r.recorded_at), 'M/d', { locale: ja }),
      score: conditionScore[r.condition!] ?? 2,
      condition: r.condition,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        データなし
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis
          domain={[0, 3]}
          tickFormatter={(v) => scoreLabel[v] ?? ''}
          tick={{ fontSize: 10 }}
          ticks={[0, 1, 2, 3]}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [scoreLabel[value as number] ?? value, '状態']}
          labelStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#1A56DB"
          strokeWidth={2}
          dot={{ r: 4, fill: '#1A56DB' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
