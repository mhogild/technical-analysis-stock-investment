import pandas as pd
from typing import Optional
from config import (
    ADX_STRONG_TREND, ADX_MODERATE_TREND,
    WEIGHT_MOMENTUM, WEIGHT_TREND, WEIGHT_VOLATILITY, WEIGHT_VOLUME,
)
from models.signal import ConsolidatedSignal, MonthlyTrendSignal

Signal = str  # "Buy", "Sell", "Neutral"


class SignalEngine:
    """Compute individual indicator signals and consolidated recommendation."""

    # --- Individual Signal Rules ---

    def signal_sma_cross(self, indicators: dict) -> Signal:
        """Golden Cross / Death Cross: SMA 50 vs SMA 200."""
        sma_50 = indicators.get("sma_50")
        sma_200 = indicators.get("sma_200")
        if sma_50 is None or sma_200 is None:
            return "Neutral"
        s50 = _last_valid(sma_50)
        s200 = _last_valid(sma_200)
        if s50 is None or s200 is None:
            return "Neutral"
        if s50 > s200:
            return "Buy"
        elif s50 < s200:
            return "Sell"
        return "Neutral"

    def signal_ema(self, indicators: dict, close_price: float) -> Signal:
        """Price vs EMA: price > EMA = Buy."""
        ema_12 = _last_valid(indicators.get("ema_12"))
        if ema_12 is None:
            return "Neutral"
        if close_price > ema_12:
            return "Buy"
        elif close_price < ema_12:
            return "Sell"
        return "Neutral"

    def signal_rsi(self, indicators: dict) -> Signal:
        """RSI: <30 = Buy (oversold), >70 = Sell (overbought)."""
        rsi = _last_valid(indicators.get("rsi"))
        if rsi is None:
            return "Neutral"
        if rsi < 30:
            return "Buy"
        elif rsi > 70:
            return "Sell"
        return "Neutral"

    def signal_macd(self, indicators: dict) -> Signal:
        """MACD line > Signal line = Buy."""
        macd_data = indicators.get("macd", {})
        macd_line = _last_valid(macd_data.get("macd"))
        signal_line = _last_valid(macd_data.get("signal"))
        if macd_line is None or signal_line is None:
            return "Neutral"
        if macd_line > signal_line:
            return "Buy"
        elif macd_line < signal_line:
            return "Sell"
        return "Neutral"

    def signal_bollinger(self, indicators: dict, close_price: float) -> Signal:
        """Price below lower band = Buy, above upper = Sell."""
        bb = indicators.get("bollinger", {})
        lower = _last_valid(bb.get("lower"))
        upper = _last_valid(bb.get("upper"))
        if lower is None or upper is None:
            return "Neutral"
        if close_price < lower:
            return "Buy"
        elif close_price > upper:
            return "Sell"
        return "Neutral"

    def signal_williams_r(self, indicators: dict) -> Signal:
        """Williams %R: < -80 = Buy, > -20 = Sell."""
        wr = _last_valid(indicators.get("williams_r"))
        if wr is None:
            return "Neutral"
        if wr < -80:
            return "Buy"
        elif wr > -20:
            return "Sell"
        return "Neutral"

    def signal_mfi(self, indicators: dict) -> Signal:
        """MFI: <20 = Buy, >80 = Sell."""
        mfi = _last_valid(indicators.get("mfi"))
        if mfi is None:
            return "Neutral"
        if mfi < 20:
            return "Buy"
        elif mfi > 80:
            return "Sell"
        return "Neutral"

    def signal_roc(self, indicators: dict) -> Signal:
        """ROC: > 0 and rising = Buy confirmation, < 0 and falling = Sell."""
        roc = indicators.get("roc")
        if roc is None:
            return "Neutral"
        roc_val = _last_valid(roc)
        if roc_val is None:
            return "Neutral"
        if roc_val > 0:
            return "Buy"
        elif roc_val < 0:
            return "Sell"
        return "Neutral"

    def signal_vwap(self, indicators: dict, close_price: float) -> Signal:
        """Price > VWAP = Buy, < VWAP = Sell."""
        vwap = _last_valid(indicators.get("vwap"))
        if vwap is None:
            return "Neutral"
        if close_price > vwap:
            return "Buy"
        elif close_price < vwap:
            return "Sell"
        return "Neutral"

    # --- Consolidated Signal ---

    def compute_all_signals(
        self, indicators: dict, close_price: float,
    ) -> dict[str, Signal]:
        """Compute signals for all indicators."""
        return {
            "SMA Cross": self.signal_sma_cross(indicators),
            "EMA": self.signal_ema(indicators, close_price),
            "RSI": self.signal_rsi(indicators),
            "MACD": self.signal_macd(indicators),
            "Bollinger Bands": self.signal_bollinger(indicators, close_price),
            "Williams %R": self.signal_williams_r(indicators),
            "MFI": self.signal_mfi(indicators),
            "ROC": self.signal_roc(indicators),
            "VWAP": self.signal_vwap(indicators, close_price),
        }

    def compute_consolidated(
        self, indicators: dict, close_price: float,
    ) -> ConsolidatedSignal:
        signals = self.compute_all_signals(indicators, close_price)
        adx_val = _last_valid(indicators.get("adx"))

        # Assign numeric values
        def sig_val(s: str) -> float:
            return {"Buy": 1.0, "Sell": -1.0, "Neutral": 0.0}.get(s, 0.0)

        # Weighted categories
        momentum_sigs = [signals["Williams %R"], signals["RSI"], signals["MFI"]]
        trend_sigs = [signals["SMA Cross"], signals["EMA"], signals["MACD"]]
        volatility_sigs = [signals["Bollinger Bands"]]
        volume_sigs = [signals["ROC"]]
        if signals.get("VWAP") != "Neutral":
            volume_sigs.append(signals["VWAP"])

        def avg_signal(sigs: list[str]) -> float:
            if not sigs:
                return 0.0
            return sum(sig_val(s) for s in sigs) / len(sigs)

        score = (
            WEIGHT_MOMENTUM * avg_signal(momentum_sigs)
            + WEIGHT_TREND * avg_signal(trend_sigs)
            + WEIGHT_VOLATILITY * avg_signal(volatility_sigs)
            + WEIGHT_VOLUME * avg_signal(volume_sigs)
        )

        # Map score to level
        if score >= 0.6:
            level = "Strong Buy"
        elif score >= 0.2:
            level = "Buy"
        elif score > -0.2:
            level = "Hold"
        elif score > -0.6:
            level = "Sell"
        else:
            level = "Strong Sell"

        # ADX confidence
        if adx_val is not None and adx_val > ADX_STRONG_TREND:
            adx_confidence = "high"
        elif adx_val is not None and adx_val > ADX_MODERATE_TREND:
            adx_confidence = "moderate"
        else:
            adx_confidence = "low"

        buy_count = sum(1 for s in signals.values() if s == "Buy")
        sell_count = sum(1 for s in signals.values() if s == "Sell")
        neutral_count = sum(1 for s in signals.values() if s == "Neutral")

        explanation = self._generate_explanation(
            signals, adx_val, adx_confidence, level, score,
        )

        return ConsolidatedSignal(
            signal=level,
            score=round(score, 3),
            explanation=explanation,
            adx_value=round(adx_val, 2) if adx_val is not None else None,
            adx_confidence=adx_confidence,
            individual_signals=signals,
            buy_count=buy_count,
            sell_count=sell_count,
            neutral_count=neutral_count,
        )

    def _generate_explanation(
        self,
        signals: dict[str, str],
        adx_val: Optional[float],
        adx_confidence: str,
        level: str,
        score: float,
    ) -> str:
        buy_indicators = [k for k, v in signals.items() if v == "Buy"]
        sell_indicators = [k for k, v in signals.items() if v == "Sell"]
        neutral_indicators = [k for k, v in signals.items() if v == "Neutral"]

        parts = [f"{level}"]

        if adx_val is not None:
            adx_label = {
                "high": "Strong trend",
                "moderate": "Moderate trend",
                "low": "Weak/no trend",
            }[adx_confidence]
            parts.append(f"(ADX: {adx_val:.0f} — {adx_label})")

        total = len(signals)
        parts.append(
            f"— {len(buy_indicators)} of {total} indicators signal Buy."
        )

        if buy_indicators:
            parts.append(f"Bullish: {', '.join(buy_indicators)}.")
        if sell_indicators:
            parts.append(f"Bearish: {', '.join(sell_indicators)}.")

        if adx_confidence == "low":
            parts.append(
                "Note: The market is not trending; signals may be less reliable."
            )

        return " ".join(parts)


def _last_valid(series) -> Optional[float]:
    """Get the last non-NaN value from a pandas Series or return None."""
    if series is None:
        return None
    if isinstance(series, (int, float)):
        return float(series)
    if isinstance(series, pd.Series):
        valid = series.dropna()
        if valid.empty:
            return None
        return float(valid.iloc[-1])
    return None
