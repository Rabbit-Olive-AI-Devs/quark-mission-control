"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({
  data,
  color = "#00D4AA",
  height = 40,
}: SparklineProps) {
  const width = 200; // viewBox width, stretches to container via 100% width

  const { linePath, areaPath, gradientId, glowId, dotX, dotY, hasData } = useMemo(() => {
    const id = `sparkline-grad-${Math.random().toString(36).slice(2, 8)}`;
    const gId = `sparkline-glow-${Math.random().toString(36).slice(2, 8)}`;

    if (data.length === 0) {
      return {
        linePath: `M 0 ${height} L ${width} ${height}`,
        areaPath: `M 0 ${height} L ${width} ${height} L ${width} ${height} L 0 ${height} Z`,
        gradientId: id,
        glowId: gId,
        dotX: 0,
        dotY: 0,
        hasData: false,
      };
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1; // avoid division by zero

    const padding = 2; // top/bottom padding in viewBox units
    const usableHeight = height - padding * 2;

    const points = data.map((v, i) => {
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
      const y = padding + usableHeight - ((v - min) / range) * usableHeight;
      return { x, y };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area =
      line +
      ` L ${points[points.length - 1].x} ${height}` +
      ` L ${points[0].x} ${height} Z`;

    const lastPoint = points[points.length - 1];

    return {
      linePath: line,
      areaPath: area,
      gradientId: id,
      glowId: gId,
      dotX: lastPoint.x,
      dotY: lastPoint.y,
      hasData: true,
    };
  }, [data, height, width]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        {/* Glow filter for the trailing dot */}
        <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
      />
      {/* Trailing dot on latest data point */}
      {hasData && (
        <>
          <circle
            cx={dotX}
            cy={dotY}
            r={4}
            fill={color}
            opacity={0.3}
            filter={`url(#${glowId})`}
          />
          <circle
            cx={dotX}
            cy={dotY}
            r={2}
            fill={color}
          />
        </>
      )}
    </svg>
  );
}
