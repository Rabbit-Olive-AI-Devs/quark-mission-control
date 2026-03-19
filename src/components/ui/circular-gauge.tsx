"use client";

interface CircularGaugeProps {
  /** Value 0-100 */
  value: number;
  /** Diameter in px. Default 120. */
  size?: number;
  /** Override color. If omitted, uses threshold-based color. */
  color?: string;
  /** Override glow color. If omitted, uses same as color. */
  glowColor?: string;
}

function getColor(value: number): string {
  if (value >= 80) return "#00D4AA";
  if (value >= 50) return "#F59E0B";
  return "#EF4444";
}

export function CircularGauge({
  value,
  size = 120,
  color,
  glowColor,
}: CircularGaugeProps) {
  const strokeWidth = size >= 100 ? 8 : 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  const strokeColor = color ?? getColor(clampedValue);
  const glow = glowColor ?? strokeColor;
  const center = size / 2;

  // Font size scales with gauge size
  const fontSize = Math.round(size / 3.5);

  // Unique filter ID for glow effect
  const filterId = `gauge-glow-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Cinematic outer glow filter */}
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Faint outer ring — atmospheric depth */}
        <circle
          cx={center}
          cy={center}
          r={radius + strokeWidth * 0.6}
          fill="none"
          stroke="rgba(255,255,255,0.02)"
          strokeWidth={1}
        />

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Value arc with glow */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          filter={`url(#${filterId})`}
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
            filter: `drop-shadow(0 0 10px ${glow}50) drop-shadow(0 0 20px ${glow}20)`,
          }}
        />

        {/* Center value text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[#F1F5F9] font-mono font-bold"
          style={{
            fontSize,
            textShadow: `0 0 12px ${glow}30`,
          }}
        >
          {Math.round(clampedValue)}
        </text>
      </svg>
    </div>
  );
}
