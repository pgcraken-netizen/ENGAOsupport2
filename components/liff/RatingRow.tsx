'use client';

interface RatingRowProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (val: string) => void;
}

// 選択値が「良好寄り」かどうかの判定（先頭が最良）
function optionClass(idx: number, total: number, selected: boolean): string {
  if (!selected) return 'bg-white border border-engao-border text-engao-sub';
  if (idx === 0) return 'bg-engao-green text-white border border-engao-green';
  if (idx === 1) return 'bg-engao-green-light text-engao-green-dark border border-engao-green';
  if (idx === 2) return 'bg-engao-orange-light text-engao-warn border border-engao-orange';
  if (idx === total - 2) return 'bg-orange-100 text-orange-700 border border-orange-400';
  return 'bg-engao-danger-light text-engao-danger border border-engao-danger';
}

export function RatingRow({ label, options, value, onChange }: RatingRowProps) {
  return (
    <div className="py-3 border-b border-engao-border last:border-b-0">
      <p className="text-xs text-engao-sub mb-2">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt, idx) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${optionClass(idx, options.length, value === opt)}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
