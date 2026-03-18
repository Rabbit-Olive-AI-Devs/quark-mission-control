"use client";

import { useMemo, useState, type ReactNode } from "react";
import { panelClass, headingClass, tabActiveClass, tabIdleClass } from "./styles";

type PlatformKey = "x" | "tiktok" | "instagram" | "youtube" | "substack";

interface PlatformBreakdownTabsProps {
  data: Record<PlatformKey, ReactNode>;
}

const order: PlatformKey[] = ["x", "tiktok", "instagram", "youtube", "substack"];

export function PlatformBreakdownTabs({ data }: PlatformBreakdownTabsProps) {
  const [active, setActive] = useState<PlatformKey>("x");
  const panel = useMemo(() => data[active], [data, active]);

  return (
    <div className={panelClass}>
      <h3 className={headingClass}>Platform Breakdown</h3>
      <div role="tablist" className="mt-3 flex flex-wrap gap-2">
        {order.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={active === key}
            onClick={() => setActive(key)}
            className={`rounded-md border px-2.5 py-1.5 text-xs capitalize ${active === key ? tabActiveClass : tabIdleClass}`}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="mt-4 text-sm text-[#94A3B8]">{panel}</div>
    </div>
  );
}
