"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

export function useSSE() {
  const setConnected = useDashboardStore((s) => s.setConnected);
  const setLastEvent = useDashboardStore((s) => s.setLastEvent);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    function connect() {
      eventSource = new EventSource("/api/events");

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== "connected") {
            setLastEvent(data);
          }
        } catch {
          // Ignore parse errors (heartbeat comments)
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        // Reconnect after 5s
        reconnectTimer.current = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [setConnected, setLastEvent]);
}
