"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PipelineCard } from "@/components/status/pipeline-card";
import { CronCard } from "@/components/status/cron-card";
import { QuotaCard } from "@/components/status/quota-card";
import { QuarkCard } from "@/components/status/quark-card";
import { SystemCard } from "@/components/status/system-card";
import type { StatusCard } from "@/lib/parsers/types";
import { formatTimeShort } from "@/lib/utils";

interface StatusResponse {
  pipeline: StatusCard & { jobs?: unknown[] };
  cron: StatusCard & { jobs?: Array<Record<string, unknown>> };
  quota: StatusCard & { raw?: Record<string, unknown> };
  quark: StatusCard & { heartbeat?: Record<string, unknown> };
  system: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
    processes?: Array<Record<string, unknown>>;
  };
  timestamp: string;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (active) setData(json);
      } catch (e) {
        if (active) setError(String(e));
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (error && !data) {
    return (
      <AppShell>
        <div className="p-6 text-red-400">Failed to load status: {error}</div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#F1F5F9]">Status</h1>
          {data.timestamp && (
            <span className="text-xs text-[#94A3B8]">
              Updated {formatTimeShort(data.timestamp)}
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PipelineCard data={data.pipeline} />
          <CronCard data={data.cron} />
          <QuotaCard data={data.quota} />
          <QuarkCard data={data.quark} />
          <SystemCard data={data.system} />
        </div>
      </div>
    </AppShell>
  );
}
