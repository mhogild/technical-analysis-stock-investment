import pytest
import pandas as pd
import numpy as np
from services.indicator_calculator import IndicatorCalculator


@pytest.fixture
def calculator():
    return IndicatorCalculator()


@pytest.fixture
def sample_df():
    """Create a sample OHLCV DataFrame with 300 days of data."""
    np.random.seed(42)
    dates = pd.date_range("2023-01-01", periods=300, freq="B")
    close = 100 + np.cumsum(np.random.randn(300) * 0.5)
    high = close + np.abs(np.random.randn(300))
    low = close - np.abs(np.random.randn(300))
    open_ = close + np.random.randn(300) * 0.3
    volume = np.random.randint(1_000_000, 10_000_000, size=300)

    df = pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": volume},
        index=dates,
    )
    return df


class TestSMA:
    def test_sma_returns_series(self, calculator, sample_df):
        result = calculator.calc_sma(sample_df, 50)
        assert isinstance(result, pd.Series)
        assert len(result) == len(sample_df)

    def test_sma_first_values_are_nan(self, calculator, sample_df):
        result = calculator.calc_sma(sample_df, 50)
        assert pd.isna(result.iloc[0])
        assert not pd.isna(result.iloc[50])

    def test_sma_200_requires_data(self, calculator, sample_df):
        result = calculator.calc_sma(sample_df, 200)
        non_null = result.dropna()
        assert len(non_null) > 0
        assert len(non_null) <= len(sample_df) - 199


class TestEMA:
    def test_ema_returns_series(self, calculator, sample_df):
        result = calculator.calc_ema(sample_df, 12)
        assert isinstance(result, pd.Series)

    def test_ema_reacts_faster_than_sma(self, calculator, sample_df):
        """EMA should have less lag than SMA for same period."""
        ema = calculator.calc_ema(sample_df, 50).dropna()
        sma = calculator.calc_sma(sample_df, 50).dropna()
        # Both should have values, EMA should differ from SMA
        assert len(ema) > 0
        assert not ema.equals(sma)


class TestRSI:
    def test_rsi_range(self, calculator, sample_df):
        result = calculator.calc_rsi(sample_df, 14)
        valid = result.dropna()
        assert valid.min() >= 0
        assert valid.max() <= 100

    def test_rsi_returns_series(self, calculator, sample_df):
        result = calculator.calc_rsi(sample_df, 14)
        assert isinstance(result, pd.Series)


class TestMACD:
    def test_macd_returns_dict(self, calculator, sample_df):
        result = calculator.calc_macd(sample_df)
        assert "macd" in result
        assert "signal" in result
        assert "histogram" in result

    def test_macd_histogram_is_difference(self, calculator, sample_df):
        result = calculator.calc_macd(sample_df)
        valid_idx = result["macd"].dropna().index.intersection(
            result["signal"].dropna().index
        )
        if len(valid_idx) > 0:
            diff = result["macd"][valid_idx] - result["signal"][valid_idx]
            np.testing.assert_array_almost_equal(
                result["histogram"][valid_idx].values, diff.values, decimal=4
            )


class TestBollinger:
    def test_bollinger_bands_structure(self, calculator, sample_df):
        result = calculator.calc_bollinger(sample_df)
        assert "upper" in result
        assert "middle" in result
        assert "lower" in result

    def test_upper_greater_than_lower(self, calculator, sample_df):
        result = calculator.calc_bollinger(sample_df)
        valid_idx = result["upper"].dropna().index
        assert (result["upper"][valid_idx] >= result["lower"][valid_idx]).all()


class TestWilliamsR:
    def test_range(self, calculator, sample_df):
        result = calculator.calc_williams_r(sample_df, 14)
        valid = result.dropna()
        assert valid.min() >= -100
        assert valid.max() <= 0


class TestMFI:
    def test_range(self, calculator, sample_df):
        result = calculator.calc_mfi(sample_df, 14)
        valid = result.dropna()
        assert valid.min() >= 0
        assert valid.max() <= 100


class TestComputeAll:
    def test_compute_all_returns_all_keys(self, calculator, sample_df):
        result = calculator.compute_all(sample_df)
        expected_keys = [
            "sma_50", "sma_200", "ema_12", "ema_26", "rsi",
            "macd", "bollinger", "williams_r", "mfi",
            "roc", "adx", "atr", "monthly_trend",
        ]
        for key in expected_keys:
            assert key in result, f"Missing key: {key}"


class TestMonthlyTrend:
    def test_monthly_trend_signal(self, calculator, sample_df):
        result = calculator.calc_monthly_trend(sample_df)
        assert "signal" in result
        assert result["signal"] in ["Invested", "Caution", None]

    def test_monthly_trend_distance(self, calculator, sample_df):
        result = calculator.calc_monthly_trend(sample_df)
        if result["signal"]:
            assert "distance_percent" in result
            assert isinstance(result["distance_percent"], (int, float))
