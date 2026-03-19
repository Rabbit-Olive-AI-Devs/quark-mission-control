"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { Cpu } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard";

interface Props {
  data: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
    processes?: Array<Record<string, unknown>>;
  };
}

export function SystemCard({ data }: Props) {
  const [open, setOpen] = useState(false);
  const connected = useDashboardStore((s) => s.connected);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <Cpu size={16} />
          <HoverCard content={<p>MacBook system metrics. Above 80% = amber. Above 95% = red.</p>}>
            <span className="text-xs font-medium uppercase tracking-wider">System</span>
          </HoverCard>
          <span
            className={`ml-auto inline-block h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500 shadow-emerald-500/40" : "bg-red-500 shadow-red-500/40"
            } shadow-sm`}
            title={connected ? "Connected" : "Disconnected"}
          />
        </div>
        <div className="flex items-center justify-around pt-1">
          <RadialGauge value={data.cpu} size={72} label="CPU" />
          <RadialGauge value={data.memory} size={72} label="MEM" />
          <RadialGauge value={data.disk} size={72} label="DISK" />
        </div>
      </button>
      <DetailPanel open={open} onClose={() => setOpen(false)} title="System Details">
        <div className="space-y-4 text-sm text-[#94A3B8]">
          <div className="flex justify-around">
            <RadialGauge value={data.cpu} size={100} label="CPU" />
            <RadialGauge value={data.memory} size={100} label="Memory" />
            <RadialGauge value={data.disk} size={100} label="Disk" />
          </div>
        </div>
      </DetailPanel>
    </>
  );
}
