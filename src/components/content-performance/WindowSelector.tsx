interface WindowSelectorProps {
  value: 7 | 14 | 30;
  onChange: (days: 7 | 14 | 30) => void;
}

export function WindowSelector({ value, onChange }: WindowSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="cp-window" className="sr-only">
        Time window
      </label>
      <select
        id="cp-window"
        aria-label="Time window"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value) as 7 | 14 | 30)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#F1F5F9]"
      >
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
      </select>
    </div>
  );
}
