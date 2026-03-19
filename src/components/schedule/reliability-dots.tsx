"use client";

interface ReliabilityDotsProps {
  /** Array of "ok" | "error" statuses, most recent last. Max 7 shown. */
  runs: Array<{ status: "ok" | "error" }>;
}

const DOT_COLORS = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  empty: "bg-white/10",
};

export function ReliabilityDots({ runs }: ReliabilityDotsProps) {
  // Pad to 7 entries (empty on the left, recent on the right)
  const padded = Array.from({ length: 7 }, (_, i) => {
    const idx = i - (7 - runs.length);
    return idx >= 0 ? runs[idx] : null;
  });

  return (
    <div className="flex items-center gap-0.5" title={`${runs.filter(r => r.status === "ok").length}/${runs.length} recent runs passed`}>
      {padded.map((run, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            run ? DOT_COLORS[run.status] : DOT_COLORS.empty
          }`}
        />
      ))}
    </div>
  );
}
