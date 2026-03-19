import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PipelineCard } from "../pipeline-card";
import { CronCard } from "../cron-card";
import { SystemCard } from "../system-card";
import { useDashboardStore } from "@/stores/dashboard";

describe("PipelineCard", () => {
  it("renders healthy status", () => {
    render(
      <PipelineCard
        data={{
          level: "healthy",
          sentence: "2 jobs active, on track",
          details: { active: [] },
        }}
      />
    );
    expect(screen.getByText("2 jobs active, on track")).toBeInTheDocument();
  });

  it("opens detail panel on click", () => {
    render(
      <PipelineCard
        data={{
          level: "warning",
          sentence: "1 job stuck at L4b (2h)",
          details: { stuck: [{ stage: "L4b" }], active: [] },
        }}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Pipeline Details")).toBeInTheDocument();
  });
});

describe("CronCard", () => {
  it("renders failed jobs count", () => {
    render(
      <CronCard
        data={{
          level: "critical",
          sentence: "2/20 failed: Cassian, Deep Work",
          details: { total: 20, failed: [] },
          jobs: [
            { name: "Cassian", status: "error" },
            { name: "Deep Work", status: "error" },
          ],
        }}
      />
    );
    expect(
      screen.getByText("2/20 failed: Cassian, Deep Work")
    ).toBeInTheDocument();
  });
});

describe("SystemCard", () => {
  it("renders three gauges", () => {
    useDashboardStore.setState({ connected: true });
    render(
      <SystemCard
        data={{
          level: "healthy",
          sentence: "CPU 45% · Mem 62% · Disk 55%",
          details: {},
          cpu: 45,
          memory: 62,
          disk: 55,
        }}
      />
    );
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("MEM")).toBeInTheDocument();
    expect(screen.getByText("DISK")).toBeInTheDocument();
  });
});
