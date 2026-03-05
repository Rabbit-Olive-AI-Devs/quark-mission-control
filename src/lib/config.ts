import path from "path";

export const WORKSPACE_PATH =
  process.env.QUARK_WORKSPACE || path.join(process.env.HOME || "/Users/quark", ".openclaw/workspace");

export const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "quark-dev";

export const AUTH_COOKIE_NAME = "qmc_auth";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
