"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Activity, Search, ChevronLeft, ChevronRight, Mail, Twitter, Calendar, MessageSquare, FileText, Zap, Clock } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { SessionEntry } from "@/lib/parsers/types";

function getIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("email") || lower.includes("gmail")) return Mail;
  if (lower.includes("x ") || lower.includes("tweet") || lower.includes("dm")) return Twitter;
  if (lower.includes("calendar") || lower.includes("schedule")) return Calendar;
  if (lower.includes("telegram") || lower.includes("message")) return MessageSquare;
  if (lower.includes("pr ") || lower.includes("commit") || lower.includes("git")) return FileText;
  return Zap;
}

export default function ActivityPage() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");

  const { data, loading } = useApi<{ entries: SessionEntry[] }>(
    `/api/session-log?date=${date}`,
    ["digest"]
  );

  const entries = data?.entries || [];

  // Flatten and filter
  const allItems = entries.flatMap((e) =>
    e.items.map((text) => ({ timeRange: e.timeRange, text }))
  );

  const filtered = search
    ? allItems.filter((item) => item.text.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  const navigateDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toLocaleDateString("en-CA"));
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <Activity size={24} className="text-[#00D4AA]" />
              Activity Feed
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">{filtered.length} entries</p>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <ChevronLeft size={16} className="text-[#94A3B8]" />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F1F5F9] [color-scheme:dark]"
            />
            <button
              onClick={() => navigateDate(1)}
              disabled={date >= today}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} className="text-[#94A3B8]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D4AA]/50"
          />
        </div>

        {/* Feed */}
        <GlassCard>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[#94A3B8] py-12">No entries for this date</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, i) => {
                const Icon = getIcon(item.text);
                return (
                  <div
                    key={i}
                    className="flex gap-3 py-3 px-2 rounded-lg hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                        <Icon size={14} className="text-[#7C3AED]" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F1F5F9]">{item.text}</p>
                      <span className="text-[10px] text-[#94A3B8] mt-1">{item.timeRange}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
