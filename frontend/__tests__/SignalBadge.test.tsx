import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SignalBadge from "@/components/ui/SignalBadge";

describe("SignalBadge", () => {
  it("renders the signal text", () => {
    render(<SignalBadge signal="Buy" />);
    expect(screen.getByText("Buy")).toBeInTheDocument();
  });

  it("applies correct aria-label", () => {
    render(<SignalBadge signal="Strong Sell" />);
    expect(screen.getByLabelText("Signal: Strong Sell")).toBeInTheDocument();
  });

  it("renders with sm size class", () => {
    render(<SignalBadge signal="Hold" size="sm" />);
    const badge = screen.getByText("Hold");
    expect(badge.className).toContain("text-xs");
  });

  it("renders with md size class by default", () => {
    render(<SignalBadge signal="Buy" />);
    const badge = screen.getByText("Buy");
    expect(badge.className).toContain("text-sm");
  });

  it("renders with lg size class", () => {
    render(<SignalBadge signal="Sell" size="lg" />);
    const badge = screen.getByText("Sell");
    expect(badge.className).toContain("text-base");
  });

  it("applies green color for Buy signals", () => {
    render(<SignalBadge signal="Buy" />);
    const badge = screen.getByText("Buy");
    expect(badge.className).toContain("green");
  });

  it("applies red color for Sell signals", () => {
    render(<SignalBadge signal="Sell" />);
    const badge = screen.getByText("Sell");
    expect(badge.className).toContain("red");
  });

  it("applies gray color for Neutral signals", () => {
    render(<SignalBadge signal="Neutral" />);
    const badge = screen.getByText("Neutral");
    expect(badge.className).toContain("gray");
  });
});
