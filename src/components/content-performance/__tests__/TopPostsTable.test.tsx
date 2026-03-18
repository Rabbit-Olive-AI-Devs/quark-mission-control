import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopPostsTable } from "@/components/content-performance/TopPostsTable";

describe("TopPostsTable", () => {
  it("renders normalized score and native metrics", () => {
    render(
      <TopPostsTable
        rows={[
          {
            id: "post-1",
            platform: "x",
            normalizedScore: 1.23,
            rawMetrics: {
              likes: 10,
              comments: 2,
              shares: 1,
              views: 100,
            },
          },
        ]}
      />
    );

    expect(screen.getByText("post-1")).toBeInTheDocument();
    expect(screen.getByText("1.23")).toBeInTheDocument();
    expect(screen.getByText(/likes: 10/i)).toBeInTheDocument();
    expect(screen.getByText(/views: 100/i)).toBeInTheDocument();
  });
});
