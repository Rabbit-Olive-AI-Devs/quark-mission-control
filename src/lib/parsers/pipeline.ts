import fs from "fs"
import path from "path"
import { PipelineData, PipelineJob, PipelineStage, PipelineScorecard } from "./types"

const WORKSPACE = process.env.QUARK_WORKSPACE || path.join(process.env.HOME || "", ".openclaw/workspace")
const RENDERS_DIR = path.join(WORKSPACE, "content-engine/renders")
const INTAKE_DIR = path.join(WORKSPACE, "content-engine/intake/approved")
const INTAKE_PENDING_DIR = path.join(WORKSPACE, "content-engine/intake/pending")
const STATE_DIR = path.join(WORKSPACE, "content-engine/state")

const TERMINAL_STATUSES = ["published", "killed", "stale"]

const STAGE_ORDER = [
  "gate_passed",
  "proof_validated",
  "screenshot_captured",
  "script_ready",
  "render_pending",
  "heygen_specs_ready",
  "heygen_submitted",
  "clips_ready",
  "assembled",
  "preview_sent",
  "published",
  "killed",
  "stale",
  "redo",
]

function deriveStages(manifest: Record<string, unknown>): PipelineStage[] {
  const currentStatus = (manifest.status as string) || "intake_pending"
  const currentIdx = STAGE_ORDER.indexOf(currentStatus)

  const displayStages = [
    { name: "gate_passed", label: "Gate" },
    { name: "proof_validated", label: "Proof" },
    { name: "screenshot_captured", label: "Screenshot" },
    { name: "script_ready", label: "Script" },
    { name: "heygen_specs_ready", label: "Spec" },
    { name: "heygen_submitted", label: "HeyGen" },
    { name: "assembled", label: "Assembly" },
    { name: "preview_sent", label: "Preview" },
    { name: "published", label: "Publish" },
  ]

  return displayStages.map((stage) => {
    const stageIdx = STAGE_ORDER.indexOf(stage.name)
    let status: PipelineStage["status"] = "pending"
    if (stageIdx < currentIdx) status = "completed"
    else if (stageIdx === currentIdx) status = "active"
    if (TERMINAL_STATUSES.includes(currentStatus) && stageIdx <= currentIdx) {
      status = stageIdx === currentIdx ? "active" : "completed"
    }

    return {
      name: stage.name,
      status,
      duration: undefined,
      timestamp: undefined,
    }
  })
}

function parseManifest(filePath: string): PipelineJob | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const jobId = raw.job_id || path.basename(filePath).replace("-render.json", "")
    const status = raw.status || "intake_pending"

    let topic = raw.topic || ""
    let contentType = raw.content_type || "unknown"
    let lane = raw.lane || "unknown"
    let viralityScore = raw.virality_score || 0
    let viralitySource = raw.virality_source || ""
    let publishTargets: string[] = []

    const intakePath = path.join(INTAKE_DIR, `${jobId}.json`)
    if (fs.existsSync(intakePath)) {
      try {
        const intake = JSON.parse(fs.readFileSync(intakePath, "utf-8"))
        topic = intake.topic || topic
        contentType = intake.content_type || contentType
        lane = intake.lane || lane
        viralityScore = intake.virality_score || viralityScore
        viralitySource = intake.virality_source || viralitySource
      } catch { /* ignore */ }
    }

    if (raw.outputs && Array.isArray(raw.outputs)) {
      publishTargets = raw.outputs.map((o: Record<string, string>) => o.variant || "").filter(Boolean)
    }
    if (publishTargets.length === 0) {
      publishTargets = raw.publish_targets || []
    }

    const createdAt = raw.created_at || ""
    let elapsed = 0
    if (createdAt) {
      const endTime = raw.published_at || raw.killed_at || new Date().toISOString()
      elapsed = Math.floor((new Date(endTime).getTime() - new Date(createdAt).getTime()) / 1000)
      if (elapsed < 0) elapsed = 0
    }

    return {
      jobId,
      status,
      contentType,
      lane,
      viralityScore,
      viralitySource,
      topic,
      createdAt,
      elapsed,
      publishTargets,
      stages: deriveStages(raw),
      killedReason: raw.killed_reason,
    }
  } catch {
    return null
  }
}

function parsePendingIntake(filePath: string): PipelineJob | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const jobId = raw.job_id || path.basename(filePath, ".json")
    const stat = fs.statSync(filePath)
    const createdAt = stat.mtime.toISOString()
    const elapsed = Math.floor((Date.now() - stat.mtime.getTime()) / 1000)

    return {
      jobId,
      status: "intake_pending",
      contentType: raw.content_type || "unknown",
      lane: raw.lane || "unknown",
      viralityScore: raw.virality_score || 0,
      viralitySource: raw.virality_source || "",
      topic: raw.topic || "",
      createdAt,
      elapsed,
      publishTargets: [],
      stages: deriveStages({ status: "intake_pending" }),
      killedReason: undefined,
    }
  } catch {
    return null
  }
}

function computeScorecard(jobs: PipelineJob[]): PipelineScorecard {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const thisWeek = jobs.filter((j) => j.createdAt && new Date(j.createdAt) >= weekAgo)

  const published = thisWeek.filter((j) => j.status === "published").length
  const killed = thisWeek.filter((j) => j.status === "killed").length
  const stale = thisWeek.filter((j) => j.status === "stale").length
  const pending = jobs.filter((j) => !TERMINAL_STATUSES.includes(j.status)).length

  const publishedJobs = thisWeek.filter((j) => j.status === "published" && j.elapsed > 0)
  const avgTimeToPublish = publishedJobs.length > 0
    ? Math.floor(publishedJobs.reduce((sum, j) => sum + j.elapsed, 0) / publishedJobs.length)
    : 0

  const contentTypeBreakdown: Record<string, number> = {}
  for (const job of thisWeek) {
    contentTypeBreakdown[job.contentType] = (contentTypeBreakdown[job.contentType] || 0) + 1
  }

  return { published, killed, stale, pending, avgTimeToPublish, contentTypeBreakdown }
}

export function parsePipelineData(): PipelineData {
  try {
    let manifestFiles: string[] = []
    if (fs.existsSync(RENDERS_DIR)) {
      manifestFiles = fs.readdirSync(RENDERS_DIR)
        .filter((f) => f.endsWith("-render.json"))
        .map((f) => path.join(RENDERS_DIR, f))
    }

    const manifestJobs: PipelineJob[] = manifestFiles
      .map(parseManifest)
      .filter((j): j is PipelineJob => j !== null)

    const manifestJobIds = new Set(manifestJobs.map((j) => j.jobId))

    // Include pending intake jobs that don't yet have render manifests
    let pendingJobs: PipelineJob[] = []
    if (fs.existsSync(INTAKE_PENDING_DIR)) {
      pendingJobs = fs.readdirSync(INTAKE_PENDING_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(INTAKE_PENDING_DIR, f))
        .map(parsePendingIntake)
        .filter((j): j is PipelineJob => j !== null && !manifestJobIds.has(j.jobId))
    }

    const jobs = [...manifestJobs, ...pendingJobs]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

    const activeJob = jobs.find((j) => !TERMINAL_STATUSES.includes(j.status)) || null

    let weights: Record<string, number> = {}
    const weightsPath = path.join(STATE_DIR, "content-type-weights.json")
    if (fs.existsSync(weightsPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(weightsPath, "utf-8"))
        weights = raw.weights || raw
      } catch { /* ignore */ }
    }

    return {
      activeJob,
      jobs,
      scorecard: computeScorecard(jobs),
      weights,
    }
  } catch {
    return {
      activeJob: null,
      jobs: [],
      scorecard: { published: 0, killed: 0, stale: 0, pending: 0, avgTimeToPublish: 0, contentTypeBreakdown: {} },
      weights: {},
    }
  }
}
