"use client"

import { AppShell } from "@/components/layout/app-shell"
import { PipelineTracker } from "@/components/content/pipeline-tracker"
import { PipelineScorecard } from "@/components/content/pipeline-scorecard"
import { JobHistory } from "@/components/content/job-history"
import { useApi } from "@/hooks/use-api"
import { PipelineData } from "@/lib/parsers/types"
import { Clapperboard } from "lucide-react"

export default function ContentPage() {
  const { data } = useApi<PipelineData>("/api/pipeline", ["pipeline"])

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Clapperboard size={22} className="text-[#00D4AA]" />
          <h1 className="text-xl font-semibold text-[#F1F5F9]">Content Pipeline</h1>
        </div>

        {/* Zone 1: Hero — Live Pipeline Tracker */}
        <PipelineTracker job={data?.activeJob ?? null} lastJob={data?.jobs?.find(j => ['published','killed','stale'].includes(j.status)) ?? null} />

        {/* Zone 2: Scorecard */}
        {data && <PipelineScorecard scorecard={data.scorecard} />}

        {/* Zone 3: Job History */}
        <div>
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Job History</h2>
          <JobHistory jobs={data?.jobs ?? []} />
        </div>
      </div>
    </AppShell>
  )
}
