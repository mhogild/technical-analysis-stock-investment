import pytest
import pandas as pd
import numpy as np
from services.signal_engine import SignalEngine
from services.indicator_calculator import IndicatorCalculator


@pytest.fixture
def engine():
    return SignalEngine()


@pytest.fixture
def calculator():
    return IndicatorCalculator()


@pytest.fixture
def sample_df():
    np.random.seed(42)
    dates = pd.date_range("2023-01-01", periods=300, freq="B")
    close = 100 + np.cumsum(np.random.randn(300) * 0.5)
    high = close + np.abs(np.random.randn(300))
    low = close - np.abs(np.random.randn(300))
    open_ = close + np.random.randn(300) * 0.3
    volume = np.random.randint(1_000_000, 10_000_000, size=300)

    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": volume},
        index=dates,
    )


class TestIndividualSignals:
    def test_rsi_oversold_is_buy(self, engine):
        assert engine.signal_rsi(25.0) == "Buy"

    def test_rsi_overbought_is_sell(self, engine):
        assert engine.signal_rsi(75.0) == "Sell"

    def test_rsi_neutral(self, engine):
        assert engine.signal_rsi(50.0) == "Neutral"

    def test_williams_r_oversold_is_buy(self, engine):
        assert engine.signal_williams_r(-85.0) == "Buy"

    def test_williams_r_overbought_is_sell(self, engine):
        assert engine.signal_williams_r(-15.0) == "Sell"

    def test_williams_r_neutral(self, engine):
        assert engine.signal_williams_r(-50.0) == "Neutral"

    def test_mfi_oversold_is_buy(self, engine):
        assert engine.signal_mfi(15.0) == "Buy"

    def test_mfi_overbought_is_sell(self, engine):
        assert engine.signal_mfi(85.0) == "Sell"


class TestConsolidatedSignal:
    def test_returns_valid_signal_level(self, engine, calculator, sample_df):
        all_indicators = calculator.compute_all(sample_df)
        close_price = float(sample_df["Close"].iloc[-1])
        result = engine.compute_consolidated(all_indicators, close_price)

        assert result.signal in [
            "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"
        ]

    def test_score_in_range(self, engine, calculator, sample_df):
        all_indicators = calculator.compute_all(sample_df)
        close_price = float(sample_df["Close"].iloc[-1])
        result = engine.compute_consolidated(all_indicators, close_price)

        assert -1.0 <= result.score <= 1.0

    def test_has_explanation(self, engine, calculator, sample_df):
        all_indicators = calculator.compute_all(sample_df)
        close_price = float(sample_df["Close"].iloc[-1])
        result = engine.compute_consolidated(all_indicators, close_price)

        assert isinstance(result.explanation, str)
        assert len(result.explanation) > 0

    def test_has_adx_confidence(self, engine, calculator, sample_df):
        all_indicators = calculator.compute_all(sample_df)
        close_price = float(sample_df["Close"].iloc[-1])
        result = engine.compute_consolidated(all_indicators, close_price)

        assert result.adx_confidence in ["high", "moderate", "low"]

    def test_buy_sell_counts_add_up(self, engine, calculator, sample_df):
        all_indicators = calculator.compute_all(sample_df)
        close_price = float(sample_df["Close"].iloc[-1])
        result = engine.compute_consolidated(all_indicators, close_price)

        total = result.buy_count + result.sell_count + result.neutral_count
        assert total > 0
        assert total == len(result.individual_signals)


class TestScoreMapping:
    def test_strong_buy_threshold(self, engine):
        assert engine._score_to_signal(0.7) == "Strong Buy"

    def test_buy_threshold(self, engine):
        assert engine._score_to_signal(0.3) == "Buy"

    def test_hold_threshold(self, engine):
        assert engine._score_to_signal(0.0) == "Hold"

    def test_sell_threshold(self, engine):
        assert engine._score_to_signal(-0.3) == "Sell"

    def test_strong_sell_threshold(self, engine):
        assert engine._score_to_signal(-0.7) == "Strong Sell"
