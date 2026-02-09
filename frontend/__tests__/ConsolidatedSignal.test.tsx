import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConsolidatedSignal from "@/components/stock/ConsolidatedSignal";
import type { ConsolidatedSignal as ConsolidatedSignalType } from "@/types";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

const mockSignal: ConsolidatedSignalType = {
  signal: "Buy",
  score: 0.65,
  explanation: "Majority of indicators suggest bullish momentum.",
  adx_value: 28,
  adx_confidence: "high",
  individual_signals: { rsi: "Buy", macd: "Buy", sma_cross: "Neutral" },
  buy_count: 5,
  sell_count: 1,
  neutral_count: 2,
};

describe("ConsolidatedSignal", () => {
  it("renders the signal badge", () => {
    render(<ConsolidatedSignal signal={mockSignal} />);
    expect(screen.getByText("Buy")).toBeInTheDocument();
  });

  it("displays buy, sell, and neutral counts", () => {
    render(<ConsolidatedSignal signal={mockSignal} />);
    expect(screen.getByText("5 Buy")).toBeInTheDocument();
    expect(screen.getByText("1 Sell")).toBeInTheDocument();
    expect(screen.getByText("2 Neutral")).toBeInTheDocument();
  });

  it("displays total indicator count", () => {
    render(<ConsolidatedSignal signal={mockSignal} />);
    expect(screen.getByText("of 8 indicators")).toBeInTheDocument();
  });

  it("displays explanation text", () => {
    render(<ConsolidatedSignal signal={mockSignal} />);
    expect(
      screen.getByText("Majority of indicators suggest bullish momentum.")
    ).toBeInTheDocument();
  });

  it("shows low confidence warning when ADX is low", () => {
    const lowConfSignal = { ...mockSignal, adx_confidence: "low" as const };
    render(<ConsolidatedSignal signal={lowConfSignal} />);
    expect(
      screen.getByText("Market is not trending — signals may be less reliable")
    ).toBeInTheDocument();
  });

  it("shows moderate confidence note", () => {
    const modConfSignal = {
      ...mockSignal,
      adx_confidence: "moderate" as const,
    };
    render(<ConsolidatedSignal signal={modConfSignal} />);
    expect(screen.getByText("Moderate trend strength")).toBeInTheDocument();
  });

  it("hides confidence warning when ADX confidence is high", () => {
    render(<ConsolidatedSignal signal={mockSignal} />);
    expect(
      screen.queryByText(/not trending|Moderate trend/)
    ).not.toBeInTheDocument();
  });

  it("links to methodology page", () => {
    render(<ConsolidatedSignal signal={mockSignal} />);
    const link = screen.getByText("How is this calculated?");
    expect(link).toHaveAttribute("href", "/methodology/consolidated-signal");
  });
});
