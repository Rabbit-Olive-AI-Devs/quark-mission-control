import { NextResponse } from "next/server";
import { WORKSPACE_PATH } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  // Store cleanup function in outer scope so cancel() can access it
  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Dynamic import chokidar to avoid bundling issues
      const chokidar = await import("chokidar");

      const watchPaths = [
        `${WORKSPACE_PATH}/memory/heartbeat-state.md`,
        `${WORKSPACE_PATH}/memory/today-digest.md`,
        `${WORKSPACE_PATH}/memory/pending-actions.md`,
        `${WORKSPACE_PATH}/intel/DAILY-INTEL.md`,
        `${WORKSPACE_PATH}/metrics/dashboard.md`,
        `${WORKSPACE_PATH}/comms`,
        `${WORKSPACE_PATH}/content-engine/renders`,
        `${WORKSPACE_PATH}/content-engine/state`,
        `${WORKSPACE_PATH}/content-engine/intake/pending`,
        `${WORKSPACE_PATH}/content-engine/intake/approved`,
      ];

      const watcher = chokidar.watch(watchPaths, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
      });

      // Send heartbeat every 30s to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      watcher.on("all", (eventName: string, filePath: string) => {
        if (!["change", "add", "unlink"].includes(eventName)) return;
        const relative = filePath.replace(WORKSPACE_PATH + "/", "");
        let eventType = "update";

        if (relative.includes("heartbeat")) eventType = "heartbeat";
        else if (relative.includes("digest")) eventType = "digest";
        else if (relative.includes("pending")) eventType = "pending";
        else if (relative.includes("intel")) eventType = "intel";
        else if (relative.includes("metrics")) eventType = "metrics";
        else if (relative.includes("comms")) eventType = "comms";
        else if (relative.includes("content-engine")) eventType = "pipeline";

        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: eventType, file: relative, timestamp: Date.now() })}\n\n`)
          );
        } catch {
          // Stream closed
        }
      });

      // Store cleanup in outer scope for cancel() to access
      cleanupFn = () => {
        clearInterval(heartbeatInterval);
        watcher.close();
      };

      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`));
    },
    cancel() {
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
