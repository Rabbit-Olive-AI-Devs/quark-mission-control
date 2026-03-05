"use client";

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: number;
}

export function Gauge({ value, max, label, color = "#00D4AA", size = 80 }: GaugeProps) {
  const percent = Math.min(100, (value / max) * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="text-center -mt-[calc(var(--size)/2+8px)]" style={{ "--size": `${size}px` } as React.CSSProperties}>
        <div className="text-sm font-semibold text-[#F1F5F9]" style={{ marginTop: `${size / 2 - 12}px` }}>
          {Math.round(percent)}%
        </div>
      </div>
      <span className="text-xs text-[#94A3B8] mt-1">{label}</span>
    </div>
  );
}
