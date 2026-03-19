"use client";

interface RadialGaugeProps {
  value: number; // 0-100
  size?: number; // px, default 80
  label?: string; // e.g. "CPU"
}

export function RadialGauge({ value, size = 80, label }: RadialGaugeProps) {
  const radius = (size - 12) / 2;
  const circumference = Math.PI * radius; // half-circle
  const offset = circumference - (value / 100) * circumference;

  const color =
    value > 95
      ? "#EF4444"
      : value > 80
        ? "#F59E0B"
        : "#00D4AA";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size / 2 + 12}
        viewBox={`0 0 ${size} ${size / 2 + 12}`}
      >
        <path
          d={`M 6 ${size / 2 + 6} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 6 ${size / 2 + 6} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
            filter: `drop-shadow(0 0 4px ${color}40)`,
          }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          className="fill-[#F1F5F9] font-mono text-sm font-bold"
          style={{ fontSize: size / 5 }}
        >
          {Math.round(value)}%
        </text>
      </svg>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
          {label}
        </span>
      )}
    </div>
  );
}
