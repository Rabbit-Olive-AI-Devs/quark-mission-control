import fs from "fs"
import path from "path"
import { PipelineData, PipelineJob, PipelineStage, PipelineScorecard } from "./types"

const WORKSPACE = process.env.QUARK_WORKSPACE || path.join(process.env.HOME || "", ".openclaw/workspace")
const RENDERS_DIR = path.join(WORKSPACE, "content-engine/renders")
const INTAKE_DIR = path.join(WORKSPACE, "content-engine/intake/approved")
const INTAKE_BUCKETS = ["approved", "rejected", "quarantined", "pending"] as const
const STATE_DIR = path.join(WORKSPACE, "content-engine/state")

const TERMINAL_STATUSES = ["published", "killed", "stale", "rejected", "quarantined"]

// Extract date from job ID like "2026-03-12-001" → "2026-03-12T00:00:00.000Z"
function jobIdToDate(jobId: string): string {
  const match = jobId.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? `${match[1]}T00:00:00.000Z` : ""
}

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

function resolveIntakePath(jobId: string, sourceJob?: string): string | null {
  const candidates: string[] = []

  if (sourceJob) {
    candidates.push(path.isAbsolute(sourceJob) ? sourceJob : path.join(WORKSPACE, sourceJob))
  }

  candidates.push(path.join(INTAKE_DIR, `${jobId}.json`))
  for (const bucket of INTAKE_BUCKETS) {
    candidates.push(path.join(WORKSPACE, `content-engine/intake/${bucket}/${jobId}.json`))
  }

  return candidates.find((p) => fs.existsSync(p)) || null
}

function compareJobIdDesc(a: string, b: string): number {
  return b.localeCompare(a)
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

    const intakePath = resolveIntakePath(jobId, raw.source_job)
    if (intakePath) {
      try {
        const intake = JSON.parse(fs.readFileSync(intakePath, "utf-8"))
        topic = intake.topic || intake.title || topic
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

    const createdAt = raw.created_at || raw.updated_at || jobIdToDate(jobId)
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

function parseIntakeAsJob(filePath: string, status: string): PipelineJob | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const jobId = raw.job_id || path.basename(filePath, ".json")
    const stat = fs.statSync(filePath)
    const createdAt = raw.updated_at || stat.mtime.toISOString()
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)

    const normalizedStatus =
      status === "approved" ? "gate_passed" :
      status === "rejected" ? "killed" :
      status === "quarantined" ? "quarantined" :
      "intake_pending"

    const stageSeedStatus =
      status === "rejected" || status === "quarantined"
        ? "gate_passed"
        : normalizedStatus

    return {
      jobId,
      status: normalizedStatus,
      contentType: raw.content_type || "unknown",
      lane: raw.lane || "unknown",
      viralityScore: raw.virality_score || 0,
      viralitySource: raw.virality_source || "",
      topic: raw.topic || raw.title || "",
      createdAt,
      elapsed: Math.max(0, elapsed),
      publishTargets: [],
      stages: deriveStages({ status: stageSeedStatus }),
      killedReason: raw.rejection_reason || raw.reject_reason,
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

    const intakeExtras: PipelineJob[] = []
    const intakeBucketsForUI: Array<{ dir: string; status: string }> = [
      { dir: path.join(WORKSPACE, "content-engine/intake/pending"), status: "pending" },
      { dir: path.join(WORKSPACE, "content-engine/intake/rejected"), status: "rejected" },
      { dir: path.join(WORKSPACE, "content-engine/intake/quarantined"), status: "quarantined" },
    ]

    for (const bucket of intakeBucketsForUI) {
      if (!fs.existsSync(bucket.dir)) continue
      const bucketJobs = fs.readdirSync(bucket.dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(bucket.dir, f))
        .map((f) => parseIntakeAsJob(f, bucket.status))
        .filter((j): j is PipelineJob => j !== null && !manifestJobIds.has(j.jobId))
      intakeExtras.push(...bucketJobs)
    }

    const jobs = [...manifestJobs, ...intakeExtras]
      .sort((a, b) => compareJobIdDesc(a.jobId, b.jobId))

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
