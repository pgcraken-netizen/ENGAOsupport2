'use client';

interface TagChipsProps {
  tags: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function TagChips({ tags, selected, onChange }: TagChipsProps) {
  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 border ${
              active
                ? 'bg-engao-orange border-engao-orange text-white'
                : 'bg-white border-engao-border text-engao-sub'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
