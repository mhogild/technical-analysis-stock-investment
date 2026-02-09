import pandas as pd
import pandas_ta as ta
from typing import Optional
from config import (
    SMA_SHORT, SMA_LONG, EMA_SHORT, EMA_LONG,
    RSI_PERIOD, MACD_FAST, MACD_SLOW, MACD_SIGNAL,
    BB_PERIOD, BB_STD, WILLIAMS_PERIOD, MFI_PERIOD,
    ROC_PERIOD, ADX_PERIOD, ATR_PERIOD, MONTHLY_SMA_PERIOD,
)


class IndicatorCalculator:
    """Compute all technical indicators from OHLCV DataFrame."""

    # --- Core Indicators ---

    def calc_sma(self, df: pd.DataFrame, period: int) -> pd.Series:
        return ta.sma(df["Close"], length=period)

    def calc_ema(self, df: pd.DataFrame, period: int) -> pd.Series:
        return ta.ema(df["Close"], length=period)

    def calc_rsi(self, df: pd.DataFrame, period: int = RSI_PERIOD) -> pd.Series:
        return ta.rsi(df["Close"], length=period)

    def calc_macd(
        self, df: pd.DataFrame,
        fast: int = MACD_FAST,
        slow: int = MACD_SLOW,
        signal: int = MACD_SIGNAL,
    ) -> dict[str, pd.Series]:
        result = ta.macd(df["Close"], fast=fast, slow=slow, signal=signal)
        if result is None:
            return {"macd": pd.Series(), "signal": pd.Series(), "histogram": pd.Series()}
        cols = result.columns.tolist()
        return {
            "macd": result[cols[0]],
            "signal": result[cols[1]],
            "histogram": result[cols[2]],
        }

    def calc_bollinger(
        self, df: pd.DataFrame,
        period: int = BB_PERIOD,
        std: float = BB_STD,
    ) -> dict[str, pd.Series]:
        result = ta.bbands(df["Close"], length=period, std=std)
        if result is None:
            return {"lower": pd.Series(), "middle": pd.Series(), "upper": pd.Series()}
        cols = result.columns.tolist()
        return {
            "lower": result[cols[0]],
            "middle": result[cols[1]],
            "upper": result[cols[2]],
        }

    def calc_williams_r(
        self, df: pd.DataFrame, period: int = WILLIAMS_PERIOD,
    ) -> pd.Series:
        return ta.willr(df["High"], df["Low"], df["Close"], length=period)

    def calc_mfi(
        self, df: pd.DataFrame, period: int = MFI_PERIOD,
    ) -> pd.Series:
        return ta.mfi(df["High"], df["Low"], df["Close"], df["Volume"], length=period)

    # --- Secondary Indicators ---

    def calc_roc(self, df: pd.DataFrame, period: int = ROC_PERIOD) -> pd.Series:
        return ta.roc(df["Close"], length=period)

    def calc_adx(self, df: pd.DataFrame, period: int = ADX_PERIOD) -> pd.Series:
        result = ta.adx(df["High"], df["Low"], df["Close"], length=period)
        if result is None:
            return pd.Series()
        # ADX column is typically the first one (ADX_14)
        for col in result.columns:
            if col.startswith("ADX_"):
                return result[col]
        return result.iloc[:, 0]

    def calc_atr(self, df: pd.DataFrame, period: int = ATR_PERIOD) -> pd.Series:
        return ta.atr(df["High"], df["Low"], df["Close"], length=period)

    def calc_vwap(self, df: pd.DataFrame) -> Optional[pd.Series]:
        try:
            return ta.vwap(df["High"], df["Low"], df["Close"], df["Volume"])
        except Exception:
            return None

    # --- Monthly Trend Signal ---

    def calc_monthly_trend(self, df: pd.DataFrame) -> dict:
        """Compute 10-month (200-day) SMA rule for passive investors."""
        sma_200 = self.calc_sma(df, MONTHLY_SMA_PERIOD)
        if sma_200 is None or sma_200.dropna().empty:
            return {"signal": None, "sma_value": None, "distance_percent": None}

        current_price = df["Close"].iloc[-1]
        sma_value = sma_200.iloc[-1]

        if pd.isna(sma_value):
            return {"signal": None, "sma_value": None, "distance_percent": None}

        distance_percent = ((current_price - sma_value) / sma_value) * 100
        signal = "Invested" if current_price > sma_value else "Caution"

        return {
            "signal": signal,
            "current_price": round(float(current_price), 2),
            "sma_value": round(float(sma_value), 2),
            "distance_percent": round(float(distance_percent), 2),
        }

    # --- Compute All ---

    def compute_all(self, df: pd.DataFrame) -> dict:
        """Compute all indicators and return as a dict."""
        results = {}

        # Core
        results["sma_50"] = self.calc_sma(df, SMA_SHORT)
        results["sma_200"] = self.calc_sma(df, SMA_LONG)
        results["ema_12"] = self.calc_ema(df, EMA_SHORT)
        results["ema_26"] = self.calc_ema(df, EMA_LONG)
        results["rsi"] = self.calc_rsi(df)
        results["macd"] = self.calc_macd(df)
        results["bollinger"] = self.calc_bollinger(df)
        results["williams_r"] = self.calc_williams_r(df)
        results["mfi"] = self.calc_mfi(df)

        # Secondary
        results["roc"] = self.calc_roc(df)
        results["adx"] = self.calc_adx(df)
        results["atr"] = self.calc_atr(df)
        results["vwap"] = self.calc_vwap(df)

        # Monthly trend
        results["monthly_trend"] = self.calc_monthly_trend(df)

        return results
