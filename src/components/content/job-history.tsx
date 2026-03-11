"use client"

import { motion } from "framer-motion"
import { PipelineJob } from "@/lib/parsers/types"
import { useState } from "react"
import { STATUS_COLORS, TYPE_COLORS, formatElapsed } from "@/lib/pipeline-constants"

function formatDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "#00D4AA"
  return (
    <span
      className="text-[10px] font-mono px-2 py-0.5 rounded-full"
      style={{
        color,
        background: `${color}15`,
        border: `1px solid ${color}22`,
        boxShadow: `0 0 6px ${color}22`,
      }}
    >
      {status}
    </span>
  )
}

function JobRow({ job }: { job: PipelineJob }) {
  const [expanded, setExpanded] = useState(false)
  const typeColor = TYPE_COLORS[job.contentType] || "#94A3B8"

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-white/[0.03] cursor-pointer transition-colors"
      >
        <td className="py-2.5 px-3 font-mono text-xs text-[#F1F5F9]">{job.jobId}</td>
        <td className="py-2.5 px-3"><StatusBadge status={job.status} /></td>
        <td className="py-2.5 px-3 text-xs" style={{ color: typeColor }}>{job.contentType}</td>
        <td className="py-2.5 px-3 text-xs text-[#94A3B8]">{job.lane}</td>
        <td className="py-2.5 px-3 text-xs text-[#F59E0B] font-mono">{job.viralityScore}</td>
        <td className="py-2.5 px-3 text-xs text-[#94A3B8] max-w-[200px] truncate">{job.topic || "—"}</td>
        <td className="py-2.5 px-3 text-xs text-[#4B5563] font-mono">{formatDate(job.createdAt)}</td>
        <td className="py-2.5 px-3 text-xs text-[#4B5563] font-mono">{formatElapsed(job.elapsed)}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-3 pb-3">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 mt-1">
              <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider mb-2">Stage Log</div>
              <div className="flex flex-col gap-1">
                {job.stages.filter((s) => s.status !== "pending").map((stage, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: stage.status === "active" ? "#00D4AA" : "#10B981" }}
                      />
                      <span className="text-[10px] font-mono text-[#94A3B8]">{stage.name}</span>
                    </div>
                    {stage.duration !== undefined && (
                      <span className="text-[9px] font-mono text-[#4B5563]">{formatElapsed(stage.duration)}</span>
                    )}
                  </div>
                ))}
              </div>
              {job.killedReason && (
                <div className="mt-2 text-[10px] text-[#EF4444]">
                  Kill reason: {job.killedReason}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function JobCard({ job }: { job: PipelineJob }) {
  const [expanded, setExpanded] = useState(false)
  const typeColor = TYPE_COLORS[job.contentType] || "#94A3B8"

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="glass-card p-3 cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusBadge status={job.status} />
        <span className="font-mono text-xs text-[#F1F5F9]">{job.jobId}</span>
        <span className="text-[9px] text-[#4B5563] font-mono ml-auto">{formatElapsed(job.elapsed)}</span>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[10px]" style={{ color: typeColor }}>{job.contentType}</span>
        <span className="text-[10px] text-[#F59E0B] font-mono">v:{job.viralityScore}</span>
      </div>
      {job.topic && (
        <div className="text-[11px] text-[#94A3B8] line-clamp-2">{job.topic}</div>
      )}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-col gap-1">
            {job.stages.filter((s) => s.status !== "pending").map((stage, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: stage.status === "active" ? "#00D4AA" : "#10B981" }}
                  />
                  <span className="text-[9px] font-mono text-[#94A3B8]">{stage.name}</span>
                </div>
              </div>
            ))}
          </div>
          {job.killedReason && (
            <div className="mt-2 text-[9px] text-[#EF4444]">Kill: {job.killedReason}</div>
          )}
        </div>
      )}
    </div>
  )
}

export function JobHistory({ jobs }: { jobs: PipelineJob[] }) {
  if (jobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="glass-card p-8"
      >
        <p className="text-center text-[#94A3B8]">No jobs yet — pipeline is waiting for intake</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="light-line" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Job</th>
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Status</th>
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Type</th>
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Lane</th>
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Viral</th>
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Topic</th>
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Date</th>
                <th className="text-left py-2.5 px-3 text-[9px] text-[#94A3B8] uppercase tracking-wider font-normal">Duration</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow key={job.jobId} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2">
        {jobs.map((job) => (
          <JobCard key={job.jobId} job={job} />
        ))}
      </div>
    </motion.div>
  )
}
