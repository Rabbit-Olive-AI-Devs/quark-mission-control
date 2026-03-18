import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformBreakdownTabs } from "@/components/content-performance/PlatformBreakdownTabs";
import { StaleDataBanner } from "@/components/content-performance/StaleDataBanner";

describe("content-performance smoke", () => {
  it("switches platform tabs", () => {

    render(
      <PlatformBreakdownTabs
        data={{
          x: "X panel",
          tiktok: "TikTok panel",
          instagram: "Instagram panel",
          youtube: "YouTube panel",
          substack: "Substack panel",
        }}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /tiktok/i }));
    expect(screen.getByText("TikTok panel")).toBeInTheDocument();
  });

  it("renders stale banner when stale", () => {
    render(<StaleDataBanner stale lastSuccessAt="2026-03-18T10:00:00.000Z" />);
    expect(screen.getByText(/data may be stale/i)).toBeInTheDocument();
  });
});
