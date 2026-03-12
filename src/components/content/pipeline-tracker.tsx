"use client"

import { motion } from "framer-motion"
import { PipelineJob, PipelineStage } from "@/lib/parsers/types"
import { useState } from "react"
import { STATUS_COLORS, TYPE_COLORS, formatElapsed } from "@/lib/pipeline-constants"

const SEGMENT_LABELS = ["Gate", "Proof", "Shot", "Script", "Spec", "HeyGen", "Asm", "Preview", "Publish"]

function SegmentBar({ stages }: { stages: PipelineStage[] }) {
  return (
    <div>
      <div className="flex gap-[3px] h-2 mb-1">
        {stages.map((stage, i) => {
          const isHeyGen = stage.name === "heygen_submitted"
          let bg = ""
          if (stage.status === "completed") bg = "bg-[#10B981]"
          else if (stage.status === "pending") bg = "bg-[#1a1f2e]"

          if (stage.status === "active") {
            return (
              <div
                key={i}
                className={`rounded-[3px] glow-bar ${isHeyGen ? "flex-[2]" : "flex-1"}`}
                style={{
                  background: "linear-gradient(90deg, #00D4AA, rgba(0, 212, 170, 0.33))",
                  ["--glow-color" as string]: "rgba(0, 212, 170, 0.3)",
                }}
              />
            )
          }
          return <div key={i} className={`rounded-[3px] ${bg} ${isHeyGen ? "flex-[2]" : "flex-1"}`} />
        })}
      </div>
      <div className="flex gap-[3px]">
        {stages.map((stage, i) => {
          const isHeyGen = stage.name === "heygen_submitted"
          return (
            <div
              key={i}
              className={`text-center font-mono ${isHeyGen ? "flex-[2]" : "flex-1"} ${
                stage.status === "active" ? "text-[#00D4AA] font-semibold" : "text-[#4B5563]"
              }`}
              style={{ fontSize: "7px" }}
            >
              {SEGMENT_LABELS[i]}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StageLog({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 mt-4">
      <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider mb-2">Stage Log</div>
      <div className="flex flex-col gap-1">
        {stages.filter((s) => s.status !== "pending").map((stage, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div
                className={`rounded-full ${stage.status === "active" ? "w-2 h-2" : "w-1.5 h-1.5"}`}
                style={{
                  background: stage.status === "active" ? "#00D4AA" : "#10B981",
                  boxShadow: stage.status === "active" ? "0 0 8px rgba(0, 212, 170, 0.4)" : "none",
                }}
              />
              <span
                className={`text-[10px] font-mono ${
                  stage.status === "active" ? "text-[#00D4AA] font-semibold" : "text-[#94A3B8]"
                }`}
              >
                {stage.name}
              </span>
            </div>
            {stage.duration !== undefined && (
              <span
                className={`text-[9px] font-mono ${
                  stage.status === "active" ? "text-[#F59E0B]" : "text-[#4B5563]"
                }`}
              >
                {stage.status === "active" ? `${formatElapsed(stage.duration)} ⏱` : formatElapsed(stage.duration)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  if (!iso) return ""
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function PipelineTracker({ job, lastJob }: { job: PipelineJob | null; lastJob?: PipelineJob | null }) {
  const [expanded, setExpanded] = useState(false)

  if (!job) {
    // Idle state: show last completed job dimmed, or empty
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-5 relative overflow-hidden"
      >
        <div className="light-line absolute top-0 left-0 right-0" />
        {lastJob ? (
          <div className="opacity-50">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: STATUS_COLORS[lastJob.status] || "#94A3B8" }}
              />
              <span className="text-[#94A3B8] text-sm">
                Last: {lastJob.jobId} — {lastJob.status} {formatTimeAgo(lastJob.createdAt)}
              </span>
            </div>
            <SegmentBar stages={lastJob.stages} />
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#94A3B8]/30" />
            <span className="text-[#94A3B8] text-sm">No active pipeline job</span>
          </div>
        )}
        <div className="light-line-purple absolute bottom-0 left-0 right-0" />
      </motion.div>
    )
  }

  const statusColor = STATUS_COLORS[job.status] || "#00D4AA"
  const typeColor = TYPE_COLORS[job.contentType] || "#94A3B8"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5 relative overflow-hidden"
    >
      <div className="light-line absolute top-0 left-0 right-0" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div
          className="w-3 h-3 rounded-full pulse-live"
          style={{ background: statusColor, boxShadow: `0 0 14px ${statusColor}66` }}
        />
        <span className="text-[#F1F5F9] text-lg font-bold font-mono">{job.jobId}</span>
        <span
          className="text-[11px] font-mono px-2.5 py-0.5 rounded"
          style={{
            color: statusColor,
            background: `${statusColor}11`,
            border: `1px solid ${statusColor}22`,
          }}
        >
          {job.status}
        </span>
        <span className="text-[#F59E0B] text-[10px] font-mono ml-auto">⏱ {formatElapsed(job.elapsed)}</span>
      </div>

      {/* Segmented bar */}
      <SegmentBar stages={job.stages} />

      {/* Detail cards */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 mt-4">
        <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider mb-1">Topic</div>
        <div className="text-[12px] text-[#F1F5F9] truncate">{job.topic || "—"}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2.5">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider mb-1">Content Type</div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: typeColor }}>{job.contentType}</span>
            <span className="text-[9px] text-[#94A3B8]">• {job.lane} lane</span>
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider mb-1">Virality</div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#F59E0B]">{job.viralityScore}/10</span>
            <span className="text-[9px] text-[#94A3B8]">• {job.viralitySource || "manual"}</span>
          </div>
        </div>
      </div>

      {/* Expandable stage log */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-[#94A3B8] hover:text-[#F1F5F9] mt-3 transition-colors min-h-[44px] flex items-center"
      >
        {expanded ? "▾ Hide stage log" : "▸ Show stage log"}
      </button>
      {expanded && <StageLog stages={job.stages} />}

      {/* Footer meta */}
      <div className="flex justify-between mt-3 text-[9px] text-[#4B5563] font-mono">
        <span>total: {formatElapsed(job.elapsed)}</span>
        <span>targets: {job.publishTargets.join(" + ") || "pending"}</span>
        {!["published", "killed", "stale"].includes(job.status) && (
          <span>ETA: ~{formatElapsed(Math.max(0, 900 - job.elapsed))}</span>
        )}
      </div>

      <div className="light-line-purple absolute bottom-0 left-0 right-0" />
    </motion.div>
  )
}
