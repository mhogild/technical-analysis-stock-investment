import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatMarketCap,
  formatSignalColor,
  formatRelativeTime,
} from "@/lib/formatters";

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats with specified currency", () => {
    const result = formatCurrency(1000, "EUR");
    expect(result).toContain("1,000.00");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatPercentage", () => {
  it("adds + sign for positive values", () => {
    expect(formatPercentage(5.5)).toBe("+5.50%");
  });

  it("shows - sign for negative values", () => {
    expect(formatPercentage(-3.2)).toBe("-3.20%");
  });

  it("handles zero", () => {
    expect(formatPercentage(0)).toBe("+0.00%");
  });
});

describe("formatNumber", () => {
  it("adds commas to large numbers", () => {
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("handles small numbers", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2024-06-15");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});

describe("formatMarketCap", () => {
  it("formats trillions", () => {
    expect(formatMarketCap(2.5e12)).toBe("$2.50T");
  });

  it("formats billions", () => {
    expect(formatMarketCap(150e9)).toBe("$150.00B");
  });

  it("formats millions", () => {
    expect(formatMarketCap(500e6)).toBe("$500.00M");
  });

  it("returns N/A for null", () => {
    expect(formatMarketCap(null)).toBe("N/A");
  });

  it("formats small values with commas", () => {
    const result = formatMarketCap(500000);
    expect(result).toContain("$");
    expect(result).toContain("500,000");
  });
});

describe("formatSignalColor", () => {
  it("returns green for Strong Buy", () => {
    expect(formatSignalColor("Strong Buy")).toContain("green-600");
  });

  it("returns green for Buy", () => {
    expect(formatSignalColor("Buy")).toContain("green-500");
  });

  it("returns gray for Hold", () => {
    expect(formatSignalColor("Hold")).toContain("gray-400");
  });

  it("returns gray for Neutral", () => {
    expect(formatSignalColor("Neutral")).toContain("gray-400");
  });

  it("returns red for Sell", () => {
    expect(formatSignalColor("Sell")).toContain("red-500");
  });

  it("returns red for Strong Sell", () => {
    expect(formatSignalColor("Strong Sell")).toContain("red-600");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for recent times", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHrsAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHrsAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });
});
