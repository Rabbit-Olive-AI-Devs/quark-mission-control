import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WindowSelector } from "@/components/content-performance/WindowSelector";

describe("WindowSelector", () => {
  it("renders 7/14/30 options and triggers selection callback", () => {
    const onChange = vi.fn();

    render(<WindowSelector value={14} onChange={onChange} />);

    const select = screen.getByRole("combobox", { name: /time window/i });
    expect(screen.getByRole("option", { name: /last 7 days/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /last 14 days/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /last 30 days/i })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "30" } });
    expect(onChange).toHaveBeenCalledWith(30);
  });
});
