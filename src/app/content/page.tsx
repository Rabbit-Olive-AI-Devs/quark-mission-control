"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { FileText, TrendingUp, Zap, BookOpen, BarChart2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ContentPost, HookCategory } from "@/lib/parsers/types";
import type { HookLibraryEntry, ContentCalendar } from "@/lib/parsers/content";

const KANBAN_COLUMNS = [
  { key: "fresh", label: "Draft", color: "#94A3B8" },
  { key: "review", label: "Review", color: "#F59E0B" },
  { key: "approved", label: "Approved", color: "#7C3AED" },
  { key: "used", label: "Published", color: "#10B981" },
];

// Warmup: 14-day ramp for new accounts
const WARMUP_DAYS = 14;
const WARMUP_START = "2026-03-03"; // approximate start

function WarmupTracker() {
  const start = new Date(WARMUP_START);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const day = Math.min(elapsed, WARMUP_DAYS);
  const pct = Math.round((day / WARMUP_DAYS) * 100);

  return (
    <GlassCard delay={0.05}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#F59E0B]" />
          <h3 className="text-sm font-medium">Account Warmup</h3>
        </div>
        <span className="text-xs text-[#94A3B8]">Day {day}/{WARMUP_DAYS}</span>
      </div>

      <div className="space-y-3">
        {["TikTok", "Instagram"].map((platform) => (
          <div key={platform}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#F1F5F9]">{platform}</span>
              <span className="text-[#94A3B8]">{pct}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: platform === "TikTok" ? "linear-gradient(90deg, #00D4AA, #7C3AED)" : "linear-gradient(90deg, #F59E0B, #EF4444)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {day >= WARMUP_DAYS && (
        <div className="mt-3 text-xs text-[#10B981] flex items-center gap-1">
          <Zap size={12} /> Warmup complete — full posting cadence unlocked
        </div>
      )}
    </GlassCard>
  );
}

function HookKanban({ hooks }: { hooks: HookLibraryEntry[] }) {
  const grouped = KANBAN_COLUMNS.map((col) => ({
    ...col,
    items: hooks.filter((h) => {
      if (col.key === "fresh") return h.status === "fresh";
      if (col.key === "review") return h.status === "review" || h.status === "pending";
      if (col.key === "approved") return h.status === "approved" || h.status === "ready";
      return h.status === "used" || h.status === "published";
    }),
  }));

  return (
    <GlassCard delay={0.1}>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={16} className="text-[#7C3AED]" />
        <h3 className="text-sm font-medium">Content Pipeline</h3>
        <span className="text-xs text-[#94A3B8]">{hooks.length} hooks</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {grouped.map((col) => (
          <div key={col.key}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-xs font-medium text-[#F1F5F9]">{col.label}</span>
              <span className="text-[10px] text-[#94A3B8] ml-auto">{col.items.length}</span>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {col.items.slice(0, 8).map((hook) => (
                <div
                  key={hook.id}
                  className="px-2.5 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors border-l-2"
                  style={{ borderColor: col.color }}
                >
                  <p className="text-[11px] text-[#F1F5F9] line-clamp-2">{hook.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8] capitalize">
                      {hook.type.replace(/_/g, " ")}
                    </span>
                    {hook.uses > 0 && (
                      <span className="text-[9px] text-[#94A3B8]">{hook.uses}x used</span>
                    )}
                  </div>
                </div>
              ))}
              {col.items.length === 0 && (
                <div className="text-[10px] text-[#94A3B8] text-center py-4">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function HookPerformanceChart({ categories }: { categories: Record<string, HookCategory> }) {
  const chartData = Object.entries(categories).map(([name, cat]) => ({
    name: name.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    posts: cat.totalPosts,
    avgViews: cat.avgViews,
  }));

  const colors = ["#00D4AA", "#7C3AED", "#F59E0B", "#3B82F6", "#EF4444", "#10B981"];

  if (chartData.length === 0) return null;

  return (
    <GlassCard delay={0.2}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-[#00D4AA]" />
        <h3 className="text-sm font-medium">Hook Performance by Category</h3>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#F1F5F9" }}
          />
          <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}

interface ContentApiResponse {
  posts: ContentPost[];
  hookCategories: Record<string, HookCategory>;
  calendar: ContentCalendar;
  hookLibrary: HookLibraryEntry[];
}

export default function ContentPage() {
  const { data, loading } = useApi<ContentApiResponse>("/api/content");

  const posts = data?.posts || [];
  const categories = data?.hookCategories || {};
  const hooks = data?.hookLibrary || [];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <FileText size={24} className="text-[#00D4AA]" />
            Content Pipeline
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">{hooks.length} hooks in library, {posts.length} posts tracked</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i}><div className="animate-pulse h-32 bg-white/5 rounded" /></GlassCard>
            ))}
          </div>
        ) : (
          <>
            {/* Warmup tracker */}
            <div className="mb-4">
              <WarmupTracker />
            </div>

            {/* Kanban */}
            <div className="mb-4">
              <HookKanban hooks={hooks} />
            </div>

            {/* Hook performance chart */}
            <div className="mb-4">
              <HookPerformanceChart categories={categories} />
            </div>

            {/* Recent posts */}
            <GlassCard delay={0.25}>
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-[#7C3AED]" />
                Published Posts
              </h3>
              {posts.length === 0 ? (
                <p className="text-center text-[#94A3B8] py-8">No posts recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {posts.map((post) => (
                    <div key={post.id} className="flex items-center gap-4 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] capitalize shrink-0">
                        {post.platform}
                      </span>
                      <span className="text-sm text-[#F1F5F9] flex-1 truncate">{post.hook}</span>
                      <div className="flex gap-4 text-xs text-[#94A3B8] shrink-0">
                        <span>{post.metrics.views.toLocaleString()} views</span>
                        <span>{post.metrics.likes} likes</span>
                        <span>{post.metrics.comments} comments</span>
                      </div>
                      <span className="text-xs text-[#94A3B8] shrink-0">{post.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
