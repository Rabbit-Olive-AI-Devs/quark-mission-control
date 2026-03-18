interface LastRefreshBadgeProps {
  lastRefresh?: string | null;
}

export function LastRefreshBadge({ lastRefresh }: LastRefreshBadgeProps) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-[#94A3B8]">
      Last refresh: {lastRefresh ?? "—"}
    </span>
  );
}
