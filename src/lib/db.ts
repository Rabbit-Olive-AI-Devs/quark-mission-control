import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.env.HOME || "/Users/quark", "projects/quark-mission-control/data/mission-control.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS cron_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      job_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      duration_ms INTEGER,
      status TEXT NOT NULL,
      model_used TEXT,
      token_count INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS model_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      cost_estimate_usd REAL DEFAULT 0,
      context TEXT
    );

    CREATE TABLE IF NOT EXISTS system_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      cpu_percent REAL,
      memory_used_mb REAL,
      disk_used_gb REAL
    );

    CREATE INDEX IF NOT EXISTS idx_cron_runs_job ON cron_runs(job_id);
    CREATE INDEX IF NOT EXISTS idx_cron_runs_date ON cron_runs(started_at);
    CREATE INDEX IF NOT EXISTS idx_model_usage_date ON model_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_snapshots_date ON system_snapshots(timestamp);
  `);
}

// Cron run helpers
export function recordCronRun(jobId: string, jobName: string, status: string, durationMs?: number, model?: string, tokens?: number) {
  const db = getDb();
  db.prepare(
    `INSERT INTO cron_runs (job_id, job_name, started_at, duration_ms, status, model_used, token_count)
     VALUES (?, ?, datetime('now'), ?, ?, ?, ?)`
  ).run(jobId, jobName, durationMs ?? null, status, model ?? null, tokens ?? null);
}

export function getCronHistory(jobId?: string, days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  if (jobId) {
    return db.prepare(
      `SELECT * FROM cron_runs WHERE job_id = ? AND started_at >= ? ORDER BY started_at DESC`
    ).all(jobId, since);
  }
  return db.prepare(
    `SELECT * FROM cron_runs WHERE started_at >= ? ORDER BY started_at DESC`
  ).all(since);
}

export function getCronReliability(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const result = db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as success
     FROM cron_runs WHERE started_at >= ?`
  ).get(since) as { total: number; success: number } | undefined;

  if (!result || result.total === 0) return 100;
  return Math.round((result.success / result.total) * 1000) / 10;
}

// Model usage helpers
export function recordModelUsage(model: string, tokensIn: number, tokensOut: number, costUsd: number, context?: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO model_usage (timestamp, model, tokens_in, tokens_out, cost_estimate_usd, context)
     VALUES (datetime('now'), ?, ?, ?, ?, ?)`
  ).run(model, tokensIn, tokensOut, costUsd, context ?? null);
}

export function getModelUsageSummary(days = 7) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return db.prepare(
    `SELECT model,
            COUNT(*) as calls,
            SUM(tokens_in) as total_tokens_in,
            SUM(tokens_out) as total_tokens_out,
            SUM(cost_estimate_usd) as total_cost
     FROM model_usage WHERE timestamp >= ?
     GROUP BY model ORDER BY calls DESC`
  ).all(since);
}

// System snapshot helpers
export function recordSystemSnapshot(cpu: number, memMb: number, diskGb: number) {
  const db = getDb();
  db.prepare(
    `INSERT INTO system_snapshots (timestamp, cpu_percent, memory_used_mb, disk_used_gb)
     VALUES (datetime('now'), ?, ?, ?)`
  ).run(cpu, memMb, diskGb);
}

export function getSystemHistory(hours = 24) {
  const db = getDb();
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  return db.prepare(
    `SELECT * FROM system_snapshots WHERE timestamp >= ? ORDER BY timestamp ASC`
  ).all(since);
}
