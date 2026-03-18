import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContentPerformancePage } from "@/components/content-performance/ContentPerformancePage";

describe("ContentPerformancePage integration", () => {
  it("renders integrated sections with live-like props", () => {
    render(
      <ContentPerformancePage
        dataset={[{ id: 1 }]}
        lastRefresh="2026-03-18T10:00:00.000Z"
        stale
        lastSuccessAt="2026-03-18T08:20:00.000Z"
        auditEvents={[
          {
            timestamp: "2026-03-18T10:00:00.000Z",
            eventType: "ingest_run",
            scoreVersion: "v1",
            parserVersion: "p1",
            details: "manual refresh",
            actor: "operator",
          },
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: /content performance/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /time window/i })).toBeInTheDocument();
    expect(screen.getByText(/data may be stale/i)).toBeInTheDocument();
    expect(screen.getByText(/top posts/i)).toBeInTheDocument();
    expect(screen.getByText(/platform breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/content-type comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/audit trail/i)).toBeInTheDocument();
  });
});
