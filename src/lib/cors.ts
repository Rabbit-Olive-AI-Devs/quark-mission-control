// CORS headers for cross-origin requests from Vercel to MacBook via Tailscale Funnel
const ALLOWED_ORIGINS = [
  "https://quark-mission-control.vercel.app",
  "https://quark-mission-control-rabbit-olive-studios-projects.vercel.app",
];

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app");

  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
