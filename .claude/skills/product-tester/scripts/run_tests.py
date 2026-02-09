#!/usr/bin/env python3
"""
Comprehensive Product Test Script for Technical Analysis Stock Investment Platform

This script tests 20+ stocks across multiple global exchanges, validating:
- API endpoint functionality
- Technical indicator calculations
- Signal generation logic
- Edge case handling

Usage:
    python run_tests.py [--backend-url URL] [--quick] [--verbose]

Options:
    --backend-url   Backend API URL (default: http://localhost:8000)
    --quick         Run quick test (5 stocks only)
    --verbose       Show detailed output
"""

import argparse
import json
import sys
import time
from datetime import datetime
from typing import Any

try:
    import requests
except ImportError:
    print("Error: 'requests' library required. Install with: pip install requests")
    sys.exit(1)


# Test stock categories
TEST_STOCKS = {
    "us_large_tech": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"],
    "us_large_diversified": ["JPM", "JNJ", "PG", "XOM", "KO"],
    "european": ["NOVO-B.CO", "ASML.AS", "SAP.DE", "SHEL.L", "MC.PA"],
    "asian": ["7203.T", "9988.HK"],
    "mid_cap": ["CRWD", "ABNB", "PANW"],
    "edge_cases": ["GME", "PLTR", "T", "RIVN"],
}

QUICK_STOCKS = ["AAPL", "MSFT", "JPM", "NVDA", "GME"]


class TestResult:
    def __init__(self, name: str, passed: bool, message: str = "", details: Any = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.details = details


class ProductTester:
    def __init__(self, backend_url: str, verbose: bool = False):
        self.backend_url = backend_url.rstrip("/")
        self.verbose = verbose
        self.results: list[TestResult] = []
        self.stock_results: dict[str, dict] = {}

    def log(self, msg: str):
        if self.verbose:
            print(f"  {msg}")

    def test_backend_health(self) -> TestResult:
        """Test if backend is running"""
        try:
            resp = requests.get(f"{self.backend_url}/", timeout=5)
            if resp.status_code == 200:
                return TestResult("Backend Health", True, "Backend is running")
            return TestResult("Backend Health", False, f"Status code: {resp.status_code}")
        except Exception as e:
            return TestResult("Backend Health", False, f"Connection failed: {e}")

    def test_stock_info(self, symbol: str) -> TestResult:
        """Test stock info endpoint"""
        try:
            resp = requests.get(f"{self.backend_url}/api/stock/{symbol}", timeout=30)
            if resp.status_code != 200:
                return TestResult(f"{symbol} Info", False, f"Status: {resp.status_code}")

            data = resp.json()
            required_fields = ["symbol", "name", "current_price", "market_cap"]
            missing = [f for f in required_fields if f not in data or data[f] is None]

            if missing:
                return TestResult(f"{symbol} Info", False, f"Missing: {missing}")

            self.stock_results.setdefault(symbol, {})["info"] = data
            return TestResult(f"{symbol} Info", True, f"${data['current_price']:.2f}", data)

        except Exception as e:
            return TestResult(f"{symbol} Info", False, str(e))

    def test_stock_indicators(self, symbol: str) -> TestResult:
        """Test indicators endpoint"""
        try:
            resp = requests.get(f"{self.backend_url}/api/stock/{symbol}/indicators", timeout=60)
            if resp.status_code != 200:
                return TestResult(f"{symbol} Indicators", False, f"Status: {resp.status_code}")

            data = resp.json()

            # Check for indicators array in response
            indicators = data.get("indicators", [])
            if not indicators:
                return TestResult(f"{symbol} Indicators", False, "No indicators in response")

            # Get indicator names from the array
            indicator_names = [ind.get("name") for ind in indicators]
            core_indicators = ["rsi", "macd", "bollinger", "williams_r", "mfi"]
            missing = [i for i in core_indicators if i not in indicator_names]

            if missing:
                return TestResult(f"{symbol} Indicators", False, f"Missing: {missing}")

            self.stock_results.setdefault(symbol, {})["indicators"] = data
            return TestResult(f"{symbol} Indicators", True, f"{len(indicators)} indicators present", data)

        except Exception as e:
            return TestResult(f"{symbol} Indicators", False, str(e))

    def test_stock_signal(self, symbol: str) -> TestResult:
        """Test signal endpoint"""
        try:
            resp = requests.get(f"{self.backend_url}/api/stock/{symbol}/signal", timeout=60)
            if resp.status_code != 200:
                return TestResult(f"{symbol} Signal", False, f"Status: {resp.status_code}")

            data = resp.json()

            # Check for consolidated object in response
            consolidated = data.get("consolidated", {})
            if not consolidated:
                return TestResult(f"{symbol} Signal", False, "No consolidated signal in response")

            signal = consolidated.get("signal", "Unknown")
            score = consolidated.get("score", 0)
            adx = consolidated.get("adx_confidence", "Unknown")
            explanation = consolidated.get("explanation", "")

            # Normalize the data structure for storage
            normalized = {
                "consolidated_signal": signal,
                "score": score,
                "adx_confidence": adx,
                "explanation": explanation,
                "monthly_trend": data.get("monthly_trend"),
                "indicator_breakdown": consolidated.get("indicator_breakdown"),
            }

            self.stock_results.setdefault(symbol, {})["signal"] = normalized
            return TestResult(f"{symbol} Signal", True, f"{signal} (score: {score:.2f}, ADX: {adx})", data)

        except Exception as e:
            return TestResult(f"{symbol} Signal", False, str(e))

    def test_stock_history(self, symbol: str) -> TestResult:
        """Test history endpoint"""
        try:
            resp = requests.get(f"{self.backend_url}/api/stock/{symbol}/history?period=1mo", timeout=60)
            if resp.status_code != 200:
                return TestResult(f"{symbol} History", False, f"Status: {resp.status_code}")

            data = resp.json()
            # Check for data array in response - could be top-level or under 'data' key
            price_data = data.get("data", data) if isinstance(data, dict) else data
            if not isinstance(price_data, list) or len(price_data) == 0:
                return TestResult(f"{symbol} History", False, "No data points")

            self.stock_results.setdefault(symbol, {})["history"] = len(data)
            return TestResult(f"{symbol} History", True, f"{len(data)} data points")

        except Exception as e:
            return TestResult(f"{symbol} History", False, str(e))

    def test_search(self, query: str, expected_symbol: str = None) -> TestResult:
        """Test search endpoint"""
        try:
            resp = requests.get(f"{self.backend_url}/api/search?q={query}", timeout=15)
            if resp.status_code != 200:
                return TestResult(f"Search '{query}'", False, f"Status: {resp.status_code}")

            data = resp.json()
            if not isinstance(data, list):
                return TestResult(f"Search '{query}'", False, "Invalid response format")

            if expected_symbol and not any(r.get("symbol") == expected_symbol for r in data):
                return TestResult(f"Search '{query}'", False, f"{expected_symbol} not in results")

            return TestResult(f"Search '{query}'", True, f"{len(data)} results")

        except Exception as e:
            return TestResult(f"Search '{query}'", False, str(e))

    def validate_signal_logic(self, symbol: str) -> TestResult:
        """Validate that signal logic follows documented rules"""
        data = self.stock_results.get(symbol, {})
        indicators_data = data.get("indicators", {})
        signal_data = data.get("signal", {})

        if not indicators_data or not signal_data:
            return TestResult(f"{symbol} Signal Logic", False, "Missing indicator or signal data")

        # Convert indicators array to dict for easier lookup
        indicators_list = indicators_data.get("indicators", [])
        indicators = {ind.get("name"): ind for ind in indicators_list}

        issues = []

        # Validate RSI signal
        rsi = indicators.get("rsi", {})
        rsi_value = rsi.get("current_value")
        rsi_signal = rsi.get("signal")
        if rsi_value is not None and rsi_signal:
            expected = "Buy" if rsi_value < 30 else ("Sell" if rsi_value > 70 else "Neutral")
            if rsi_signal != expected:
                issues.append(f"RSI: {rsi_value:.1f} -> expected {expected}, got {rsi_signal}")

        # Validate Williams %R signal
        williams = indicators.get("williams_r", {})
        wr_value = williams.get("current_value")
        wr_signal = williams.get("signal")
        if wr_value is not None and wr_signal:
            expected = "Buy" if wr_value < -80 else ("Sell" if wr_value > -20 else "Neutral")
            if wr_signal != expected:
                issues.append(f"Williams %R: {wr_value:.1f} -> expected {expected}, got {wr_signal}")

        # Validate MFI signal
        mfi = indicators.get("mfi", {})
        mfi_value = mfi.get("current_value")
        mfi_signal = mfi.get("signal")
        if mfi_value is not None and mfi_signal:
            expected = "Buy" if mfi_value < 20 else ("Sell" if mfi_value > 80 else "Neutral")
            if mfi_signal != expected:
                issues.append(f"MFI: {mfi_value:.1f} -> expected {expected}, got {mfi_signal}")

        if issues:
            return TestResult(f"{symbol} Signal Logic", False, "; ".join(issues))

        return TestResult(f"{symbol} Signal Logic", True, "All signals follow documented rules")

    def test_edge_case_small_cap(self, symbol: str) -> TestResult:
        """Test small-cap warning for stocks < $10B"""
        data = self.stock_results.get(symbol, {}).get("info", {})
        market_cap = data.get("market_cap", 0)

        if market_cap and market_cap < 10_000_000_000:
            # Should show warning
            return TestResult(f"{symbol} Small-Cap Warning", True,
                            f"Market cap ${market_cap/1e9:.1f}B - warning expected")
        return TestResult(f"{symbol} Small-Cap Warning", True,
                        f"Market cap ${market_cap/1e9:.1f}B - no warning needed")

    def run_stock_tests(self, symbol: str) -> list[TestResult]:
        """Run all tests for a single stock"""
        results = []

        # Core tests
        results.append(self.test_stock_info(symbol))
        results.append(self.test_stock_indicators(symbol))
        results.append(self.test_stock_signal(symbol))
        results.append(self.test_stock_history(symbol))

        # Validation tests
        results.append(self.validate_signal_logic(symbol))

        return results

    def run_all_tests(self, quick: bool = False) -> dict:
        """Run complete test suite"""
        print("\n" + "=" * 60)
        print("TECHNICAL ANALYSIS STOCK INVESTMENT PLATFORM - TEST SUITE")
        print("=" * 60)
        print(f"Backend URL: {self.backend_url}")
        print(f"Test Mode: {'Quick (5 stocks)' if quick else 'Full (20+ stocks)'}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60 + "\n")

        all_results = []

        # Backend health check
        print("1. Backend Health Check")
        print("-" * 40)
        health = self.test_backend_health()
        all_results.append(health)
        status = "PASS" if health.passed else "FAIL"
        print(f"   [{status}] {health.message}")

        if not health.passed:
            print("\n[FATAL] Backend is not running. Aborting tests.")
            return self._generate_report(all_results)

        # Search tests
        print("\n2. Search Functionality")
        print("-" * 40)
        search_tests = [
            ("AAPL", "AAPL"),
            ("Apple", "AAPL"),
            ("Microsoft", "MSFT"),
        ]
        for query, expected in search_tests:
            result = self.test_search(query, expected)
            all_results.append(result)
            status = "PASS" if result.passed else "FAIL"
            print(f"   [{status}] Search '{query}': {result.message}")

        # Stock tests
        stocks_to_test = QUICK_STOCKS if quick else sum(TEST_STOCKS.values(), [])

        print(f"\n3. Stock Analysis Tests ({len(stocks_to_test)} stocks)")
        print("-" * 40)

        for i, symbol in enumerate(stocks_to_test, 1):
            print(f"\n   [{i}/{len(stocks_to_test)}] Testing {symbol}...")

            stock_results = self.run_stock_tests(symbol)
            all_results.extend(stock_results)

            passed = sum(1 for r in stock_results if r.passed)
            total = len(stock_results)

            # Show signal if available
            signal_data = self.stock_results.get(symbol, {}).get("signal", {})
            if signal_data:
                signal = signal_data.get("consolidated_signal", "Unknown")
                score = signal_data.get("score", 0)
                print(f"        Signal: {signal} (score: {score:.2f})")

            print(f"        Tests: {passed}/{total} passed")

        # Generate report
        return self._generate_report(all_results)

    def _generate_report(self, results: list[TestResult]) -> dict:
        """Generate test summary report"""
        passed = sum(1 for r in results if r.passed)
        failed = len(results) - passed

        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {len(results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {passed/len(results)*100:.1f}%")
        print("=" * 60)

        if failed > 0:
            print("\nFailed Tests:")
            for r in results:
                if not r.passed:
                    print(f"  - {r.name}: {r.message}")

        # Stock signals summary
        print("\n" + "-" * 60)
        print("STOCK SIGNALS SUMMARY")
        print("-" * 60)
        print(f"{'Symbol':<12} {'Signal':<15} {'Score':>8} {'ADX Confidence':<15}")
        print("-" * 60)

        for symbol, data in self.stock_results.items():
            signal_data = data.get("signal", {})
            if signal_data:
                signal = signal_data.get("consolidated_signal", "N/A")
                score = signal_data.get("score", 0)
                adx = signal_data.get("adx_confidence", "N/A")
                print(f"{symbol:<12} {signal:<15} {score:>8.2f} {adx:<15}")

        # Monthly trend summary
        print("\n" + "-" * 60)
        print("MONTHLY TREND SIGNALS (10-Month SMA Rule)")
        print("-" * 60)
        for symbol, data in self.stock_results.items():
            signal_data = data.get("signal", {})
            monthly = signal_data.get("monthly_trend", {})
            if monthly:
                trend = monthly.get("signal", "N/A")
                print(f"  {symbol}: {trend}")

        report = {
            "timestamp": datetime.now().isoformat(),
            "backend_url": self.backend_url,
            "total_tests": len(results),
            "passed": passed,
            "failed": failed,
            "success_rate": passed / len(results) * 100 if results else 0,
            "stocks_tested": list(self.stock_results.keys()),
            "stock_signals": {
                symbol: {
                    "signal": data.get("signal", {}).get("consolidated_signal"),
                    "score": data.get("signal", {}).get("score"),
                    "adx_confidence": data.get("signal", {}).get("adx_confidence"),
                    "monthly_trend": data.get("signal", {}).get("monthly_trend", {}).get("signal"),
                }
                for symbol, data in self.stock_results.items()
            },
            "failed_tests": [
                {"name": r.name, "message": r.message}
                for r in results if not r.passed
            ]
        }

        return report


def main():
    parser = argparse.ArgumentParser(description="Product Test Suite")
    parser.add_argument("--backend-url", default="http://localhost:8000",
                       help="Backend API URL")
    parser.add_argument("--quick", action="store_true",
                       help="Run quick test (5 stocks only)")
    parser.add_argument("--verbose", action="store_true",
                       help="Show detailed output")
    parser.add_argument("--output", help="Save report to JSON file")

    args = parser.parse_args()

    tester = ProductTester(args.backend_url, args.verbose)
    report = tester.run_all_tests(args.quick)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport saved to: {args.output}")

    # Exit with error code if tests failed
    sys.exit(0 if report["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
