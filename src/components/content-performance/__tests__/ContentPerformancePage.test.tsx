import { render, screen } from "@testing-library/react";
import { ContentPerformancePage } from "@/components/content-performance/ContentPerformancePage";

describe("ContentPerformancePage", () => {
  it("renders title and window selector stub", () => {
    render(<ContentPerformancePage dataset={[]} />);

    expect(screen.getByRole("heading", { name: /content performance/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /time window/i })).toBeInTheDocument();
  });

  it("renders empty state when no dataset", () => {
    render(<ContentPerformancePage dataset={[]} />);

    expect(screen.getByText(/no content performance data yet/i)).toBeInTheDocument();
  });

  it("renders error state when error prop exists", () => {
    render(<ContentPerformancePage dataset={[]} error="API unavailable" />);

    expect(screen.getByText(/unable to load content performance/i)).toBeInTheDocument();
    expect(screen.getByText(/api unavailable/i)).toBeInTheDocument();
  });
});
