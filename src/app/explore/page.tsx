"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  ExploreTabs,
  type ExploreTab,
} from "@/components/explore/explore-tabs";
import { ExploreKnowledge } from "@/components/explore/explore-knowledge";
import { ExploreIntel } from "@/components/explore/explore-intel";
import { ExploreAgents } from "@/components/explore/explore-agents";
import { useApi } from "@/hooks/use-api";
import { Compass } from "lucide-react";
import type { IntelReport, AgentStatus } from "@/lib/parsers/types";

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab =
    (searchParams.get("tab") as ExploreTab) || "knowledge";
  const [tab, setTab] = useState<ExploreTab>(initialTab);

  // Lightweight data for tab count badges
  const { data: intelData } = useApi<IntelReport>("/api/intel");
  const { data: agentsData } = useApi<{ agents: AgentStatus[] }>(
    "/api/agents",
    { refreshOn: ["comms"] }
  );

  const handleTabChange = (newTab: ExploreTab) => {
    setTab(newTab);
    router.replace(`/explore?tab=${newTab}`, { scroll: false });
  };

  const intelCount = intelData
    ? (intelData.highSignal?.length || 0) +
      (intelData.rising?.length || 0) +
      (intelData.nicheSignals?.length || 0)
    : 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#F1F5F9]">
          <Compass size={24} className="text-[#00D4AA]" />
          Explore
        </h1>
        <ExploreTabs
          counts={{
            knowledge: 0,
            intel: intelCount,
            agents: agentsData?.agents?.length || 0,
          }}
          activeTab={tab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab content */}
      {tab === "knowledge" && <ExploreKnowledge />}
      {tab === "intel" && <ExploreIntel />}
      {tab === "agents" && <ExploreAgents />}
    </>
  );
}

export default function ExplorePage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <Suspense
          fallback={
            <div className="animate-pulse h-64 bg-white/5 rounded" />
          }
        >
          <ExploreContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
