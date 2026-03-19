"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { StatusSentence } from "@/components/ui/status-sentence";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { Clock } from "lucide-react";

interface Props {
  data: StatusCard & { jobs?: Array<Record<string, unknown>> };
}

export function CronCard({ data }: Props) {
  const [open, setOpen] = useState(false);
  const failed = data.jobs?.filter((j) => j.status === "error") ?? [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <Clock size={16} />
          <HoverCard content={<p>Scheduled jobs. Failures = jobs that normally succeed but just broke.</p>}>
            <span className="text-xs font-medium uppercase tracking-wider">Cron</span>
          </HoverCard>
        </div>
        <StatusSentence level={data.level} sentence={data.sentence} />
      </button>
      <DetailPanel open={open} onClose={() => setOpen(false)} title="Cron Details">
        <div className="space-y-3 text-sm text-[#94A3B8]">
          {failed.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium text-red-400">Failed Jobs</h3>
              {failed.map((j, i) => (
                <div key={i} className="mb-2 rounded bg-white/5 p-2 text-xs">
                  <span className="font-medium text-[#F1F5F9]">{String(j.name)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs">Total: {data.jobs?.length ?? 0} jobs · Failed: {failed.length}</p>
        </div>
      </DetailPanel>
    </>
  );
}
