import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FinancialMetrics from "@/components/stock/FinancialMetrics";
import type { Stock } from "@/types";

const mockStock: Stock = {
  symbol: "AAPL",
  name: "Apple Inc.",
  exchange: "NMS",
  country: "United States",
  currency: "USD",
  current_price: 195.5,
  previous_close: 193.0,
  daily_change: 2.5,
  daily_change_percent: 1.3,
  market_cap: 3e12,
  pe_ratio: 32.5,
  dividend_yield: 0.005,
  eps: 6.42,
  week_52_high: 199.62,
  week_52_low: 124.17,
  sector: "Technology",
  industry: "Consumer Electronics",
  market_status: "open",
  last_updated: new Date().toISOString(),
  is_halted: false,
};

describe("FinancialMetrics", () => {
  it("renders the section heading", () => {
    render(<FinancialMetrics stock={mockStock} />);
    expect(screen.getByText("Key Financial Metrics")).toBeInTheDocument();
  });

  it("displays market cap in trillions", () => {
    render(<FinancialMetrics stock={mockStock} />);
    expect(screen.getByText("$3.00T")).toBeInTheDocument();
  });

  it("displays P/E ratio", () => {
    render(<FinancialMetrics stock={mockStock} />);
    expect(screen.getByText("32.50")).toBeInTheDocument();
  });

  it("displays dividend yield as percentage", () => {
    render(<FinancialMetrics stock={mockStock} />);
    expect(screen.getByText("0.50%")).toBeInTheDocument();
  });

  it("displays EPS", () => {
    render(<FinancialMetrics stock={mockStock} />);
    expect(screen.getByText("$6.42")).toBeInTheDocument();
  });

  it("displays sector and industry", () => {
    render(<FinancialMetrics stock={mockStock} />);
    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(screen.getByText("Consumer Electronics")).toBeInTheDocument();
  });

  it("shows N/A for null market cap", () => {
    const noCapStock = { ...mockStock, market_cap: null };
    render(<FinancialMetrics stock={noCapStock} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows 'No dividend' when dividend_yield is null", () => {
    const noDivStock = { ...mockStock, dividend_yield: null };
    render(<FinancialMetrics stock={noDivStock} />);
    expect(screen.getByText("No dividend")).toBeInTheDocument();
  });

  it("renders all 8 metric cards", () => {
    render(<FinancialMetrics stock={mockStock} />);
    const labels = [
      "Market Cap",
      "P/E Ratio",
      "Dividend Yield",
      "EPS",
      "52-Week High",
      "52-Week Low",
      "Sector",
      "Industry",
    ];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
