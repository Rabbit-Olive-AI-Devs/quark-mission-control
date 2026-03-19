"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { StatusSentence } from "@/components/ui/status-sentence";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { Gauge } from "lucide-react";

interface Props {
  data: StatusCard & { raw?: Record<string, unknown> };
}

export function QuotaCard({ data }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <Gauge size={16} />
          <HoverCard content={<p>Daily API quota. Resets at midnight CT. Below 20% = warning.</p>}>
            <span className="text-xs font-medium uppercase tracking-wider">Quota</span>
          </HoverCard>
        </div>
        <StatusSentence level={data.level} sentence={data.sentence} />
      </button>
      <DetailPanel open={open} onClose={() => setOpen(false)} title="Quota Details">
        <div className="space-y-3 text-sm text-[#94A3B8]">
          <p>{data.sentence}</p>
          {data.raw && (
            <pre className="rounded bg-white/5 p-2 text-xs">{JSON.stringify(data.raw, null, 2)}</pre>
          )}
        </div>
      </DetailPanel>
    </>
  );
}
