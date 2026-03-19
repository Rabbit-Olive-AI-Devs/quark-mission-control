import type { StatusLevel } from "@/lib/parsers/types";

interface StatusSentenceProps {
  level: StatusLevel;
  sentence: string;
}

const DOT_COLORS: Record<StatusLevel, string> = {
  healthy: "bg-emerald-500 shadow-emerald-500/40",
  warning: "bg-amber-500 shadow-amber-500/40",
  critical: "bg-red-500 shadow-red-500/40 animate-pulse",
};

export function StatusSentence({ level, sentence }: StatusSentenceProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full shadow-sm ${DOT_COLORS[level]}`}
      />
      <span className="text-sm text-[#F1F5F9]">{sentence}</span>
    </div>
  );
}
