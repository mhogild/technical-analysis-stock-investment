from fastapi import APIRouter, HTTPException, Query
from services.data_fetcher import DataFetcher, DataFetcherError
from services.indicator_calculator import IndicatorCalculator
from services.signal_engine import SignalEngine
from models.stock import StockInfo, PriceHistory
from models.indicator import IndicatorResult, IndicatorChartData
from models.signal import ConsolidatedSignal, MonthlyTrendSignal
import pandas as pd

router = APIRouter(prefix="/api/stock", tags=["stock"])
fetcher = DataFetcher()
calculator = IndicatorCalculator()
signal_engine = SignalEngine()

# Indicator metadata for descriptions
INDICATOR_META = {
    "sma_cross": {
        "display_name": "SMA Cross (50/200)",
        "category": "trend",
        "description": "Golden Cross / Death Cross — when the 50-day SMA crosses above or below the 200-day SMA.",
        "parameters": {"short_period": 50, "long_period": 200},
    },
    "ema": {
        "display_name": "EMA (12/26)",
        "category": "trend",
        "description": "Exponential Moving Average reacts faster than SMA to price changes, catching trend shifts earlier.",
        "parameters": {"short_period": 12, "long_period": 26},
    },
    "rsi": {
        "display_name": "RSI (14)",
        "category": "momentum",
        "description": "Measures whether a stock is overbought or oversold on a scale of 0-100.",
        "parameters": {"period": 14, "overbought": 70, "oversold": 30},
    },
    "macd": {
        "display_name": "MACD (12/26/9)",
        "category": "trend",
        "description": "Reveals changes in the strength, direction, and momentum of a trend.",
        "parameters": {"fast": 12, "slow": 26, "signal": 9},
    },
    "bollinger": {
        "display_name": "Bollinger Bands (20, 2σ)",
        "category": "volatility",
        "description": "A price channel that adjusts width based on volatility. ~95% of price action falls within the bands.",
        "parameters": {"period": 20, "std_dev": 2},
    },
    "williams_r": {
        "display_name": "Williams %R (14)",
        "category": "momentum",
        "description": "Where today's close falls within the recent high-low range. 81% win rate on S&P 500 backtests.",
        "parameters": {"period": 14, "overbought": -20, "oversold": -80},
    },
    "mfi": {
        "display_name": "Money Flow Index (14)",
        "category": "momentum",
        "description": "Volume-weighted RSI that catches reversals earlier. 71% win rate on SPY backtests.",
        "parameters": {"period": 14, "overbought": 80, "oversold": 20},
    },
    "roc": {
        "display_name": "Rate of Change (9)",
        "category": "volume",
        "description": "Percentage price change over 9 periods. Useful for filtering false signals from other indicators.",
        "parameters": {"period": 9},
    },
    "adx": {
        "display_name": "ADX (14)",
        "category": "trend_strength",
        "description": "Measures trend strength regardless of direction. ADX > 25 = strong trend, < 20 = weak/no trend.",
        "parameters": {"period": 14, "strong": 25, "weak": 20},
    },
    "atr": {
        "display_name": "ATR (14)",
        "category": "volatility",
        "description": "Average True Range measures daily price volatility. Higher = more volatile.",
        "parameters": {"period": 14},
    },
}


def _series_to_chart_data(dates_index, series) -> IndicatorChartData:
    """Convert a pandas Series to chart data format."""
    if series is None or (isinstance(series, pd.Series) and series.empty):
        return IndicatorChartData(dates=[], values=[])
    dates = [d.strftime("%Y-%m-%d") for d in dates_index]
    values = [round(float(v), 4) if pd.notna(v) else None for v in series]
    return IndicatorChartData(dates=dates, values=values)


def _get_signal_explanation(name: str, signal: str, current_val) -> str:
    """Generate plain-language explanation for current indicator reading."""
    if current_val is None:
        return "Insufficient data to compute this indicator."

    explanations = {
        "rsi": {
            "Buy": f"RSI is at {current_val:.1f} — the stock is in oversold territory, suggesting it may be due for a bounce.",
            "Sell": f"RSI is at {current_val:.1f} — the stock is in overbought territory, suggesting it may be due for a pullback.",
            "Neutral": f"RSI is at {current_val:.1f} — momentum is neutral, no strong signal.",
        },
        "williams_r": {
            "Buy": f"Williams %R is at {current_val:.1f} — near the bottom of its recent range (oversold).",
            "Sell": f"Williams %R is at {current_val:.1f} — near the top of its recent range (overbought).",
            "Neutral": f"Williams %R is at {current_val:.1f} — mid-range, no strong signal.",
        },
        "mfi": {
            "Buy": f"MFI is at {current_val:.1f} — strong selling pressure with high volume (oversold).",
            "Sell": f"MFI is at {current_val:.1f} — strong buying pressure with high volume (overbought).",
            "Neutral": f"MFI is at {current_val:.1f} — normal money flow, no extreme signal.",
        },
        "sma_cross": {
            "Buy": "50-day SMA is above the 200-day SMA (Golden Cross) — bullish trend.",
            "Sell": "50-day SMA is below the 200-day SMA (Death Cross) — bearish trend.",
            "Neutral": "SMA lines are converging — trend direction is unclear.",
        },
        "ema": {
            "Buy": "Price is above the EMA — uptrend is intact.",
            "Sell": "Price is below the EMA — downtrend signal.",
            "Neutral": "Price is near the EMA — no clear direction.",
        },
        "macd": {
            "Buy": "MACD line is above the signal line — positive momentum.",
            "Sell": "MACD line is below the signal line — negative momentum.",
            "Neutral": "MACD and signal lines are converging — momentum is flat.",
        },
        "bollinger": {
            "Buy": "Price is near or below the lower Bollinger Band — potentially oversold.",
            "Sell": "Price is near or above the upper Bollinger Band — potentially overbought.",
            "Neutral": "Price is within the Bollinger Bands — normal range.",
        },
        "roc": {
            "Buy": f"ROC is at {current_val:.2f}% — positive price momentum.",
            "Sell": f"ROC is at {current_val:.2f}% — negative price momentum.",
            "Neutral": f"ROC is near zero ({current_val:.2f}%) — price is consolidating.",
        },
    }

    return explanations.get(name, {}).get(signal, f"Current value: {current_val:.2f}")


@router.get("/{symbol}", response_model=StockInfo)
async def get_stock_info(symbol: str):
    try:
        return fetcher.get_stock_info(symbol)
    except DataFetcherError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{symbol}/history", response_model=PriceHistory)
async def get_stock_history(symbol: str, period: str = Query("1y")):
    valid_periods = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"]
    if period not in valid_periods:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}",
        )
    try:
        points = fetcher.get_price_history(symbol, period)
        return PriceHistory(symbol=symbol.upper(), period=period, data=points)
    except DataFetcherError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{symbol}/indicators")
async def get_stock_indicators(symbol: str):
    try:
        df = fetcher.get_price_dataframe(symbol, period="2y")
    except DataFetcherError as e:
        raise HTTPException(status_code=404, detail=str(e))

    all_indicators = calculator.compute_all(df)
    close_price = float(df["Close"].iloc[-1])
    signals = signal_engine.compute_all_signals(all_indicators, close_price)
    dates = df.index

    indicator_results = []

    # Core indicators
    # SMA Cross
    sma_signal = signals["SMA Cross"]
    sma_50_val = all_indicators["sma_50"]
    indicator_results.append(IndicatorResult(
        name="sma_cross",
        display_name=INDICATOR_META["sma_cross"]["display_name"],
        category="trend",
        signal=sma_signal,
        current_value=float(sma_50_val.dropna().iloc[-1]) if sma_50_val is not None and not sma_50_val.dropna().empty else None,
        parameters=INDICATOR_META["sma_cross"]["parameters"],
        description=INDICATOR_META["sma_cross"]["description"],
        explanation=_get_signal_explanation("sma_cross", sma_signal, None),
        chart_data=IndicatorChartData(
            dates=[d.strftime("%Y-%m-%d") for d in dates],
            values=[round(float(v), 2) if pd.notna(v) else None for v in (sma_50_val if sma_50_val is not None else [])],
            extra_series={"sma_200": [round(float(v), 2) if pd.notna(v) else None for v in (all_indicators["sma_200"] if all_indicators["sma_200"] is not None else [])]},
        ),
    ))

    # EMA
    ema_signal = signals["EMA"]
    indicator_results.append(IndicatorResult(
        name="ema",
        display_name=INDICATOR_META["ema"]["display_name"],
        category="trend",
        signal=ema_signal,
        current_value=float(all_indicators["ema_12"].dropna().iloc[-1]) if all_indicators["ema_12"] is not None and not all_indicators["ema_12"].dropna().empty else None,
        parameters=INDICATOR_META["ema"]["parameters"],
        description=INDICATOR_META["ema"]["description"],
        explanation=_get_signal_explanation("ema", ema_signal, None),
        chart_data=IndicatorChartData(
            dates=[d.strftime("%Y-%m-%d") for d in dates],
            values=[round(float(v), 2) if pd.notna(v) else None for v in (all_indicators["ema_12"] if all_indicators["ema_12"] is not None else [])],
            extra_series={"ema_26": [round(float(v), 2) if pd.notna(v) else None for v in (all_indicators["ema_26"] if all_indicators["ema_26"] is not None else [])]},
        ),
    ))

    # RSI
    rsi_val = all_indicators["rsi"]
    rsi_current = float(rsi_val.dropna().iloc[-1]) if rsi_val is not None and not rsi_val.dropna().empty else None
    indicator_results.append(IndicatorResult(
        name="rsi",
        display_name=INDICATOR_META["rsi"]["display_name"],
        category="momentum",
        signal=signals["RSI"],
        current_value=rsi_current,
        parameters=INDICATOR_META["rsi"]["parameters"],
        description=INDICATOR_META["rsi"]["description"],
        explanation=_get_signal_explanation("rsi", signals["RSI"], rsi_current),
        chart_data=_series_to_chart_data(dates, rsi_val),
    ))

    # MACD
    macd_data = all_indicators["macd"]
    macd_current = float(macd_data["macd"].dropna().iloc[-1]) if not macd_data["macd"].empty else None
    indicator_results.append(IndicatorResult(
        name="macd",
        display_name=INDICATOR_META["macd"]["display_name"],
        category="trend",
        signal=signals["MACD"],
        current_value=macd_current,
        parameters=INDICATOR_META["macd"]["parameters"],
        description=INDICATOR_META["macd"]["description"],
        explanation=_get_signal_explanation("macd", signals["MACD"], macd_current),
        chart_data=IndicatorChartData(
            dates=[d.strftime("%Y-%m-%d") for d in dates],
            values=[round(float(v), 4) if pd.notna(v) else None for v in macd_data["macd"]],
            extra_series={
                "signal_line": [round(float(v), 4) if pd.notna(v) else None for v in macd_data["signal"]],
                "histogram": [round(float(v), 4) if pd.notna(v) else None for v in macd_data["histogram"]],
            },
        ),
    ))

    # Bollinger Bands
    bb_data = all_indicators["bollinger"]
    indicator_results.append(IndicatorResult(
        name="bollinger",
        display_name=INDICATOR_META["bollinger"]["display_name"],
        category="volatility",
        signal=signals["Bollinger Bands"],
        current_value=None,
        parameters=INDICATOR_META["bollinger"]["parameters"],
        description=INDICATOR_META["bollinger"]["description"],
        explanation=_get_signal_explanation("bollinger", signals["Bollinger Bands"], None),
        chart_data=IndicatorChartData(
            dates=[d.strftime("%Y-%m-%d") for d in dates],
            values=[round(float(v), 2) if pd.notna(v) else None for v in bb_data.get("middle", [])],
            extra_series={
                "upper": [round(float(v), 2) if pd.notna(v) else None for v in bb_data.get("upper", [])],
                "lower": [round(float(v), 2) if pd.notna(v) else None for v in bb_data.get("lower", [])],
            },
        ),
    ))

    # Williams %R
    wr_val = all_indicators["williams_r"]
    wr_current = float(wr_val.dropna().iloc[-1]) if wr_val is not None and not wr_val.dropna().empty else None
    indicator_results.append(IndicatorResult(
        name="williams_r",
        display_name=INDICATOR_META["williams_r"]["display_name"],
        category="momentum",
        signal=signals["Williams %R"],
        current_value=wr_current,
        parameters=INDICATOR_META["williams_r"]["parameters"],
        description=INDICATOR_META["williams_r"]["description"],
        explanation=_get_signal_explanation("williams_r", signals["Williams %R"], wr_current),
        chart_data=_series_to_chart_data(dates, wr_val),
    ))

    # MFI
    mfi_val = all_indicators["mfi"]
    mfi_current = float(mfi_val.dropna().iloc[-1]) if mfi_val is not None and not mfi_val.dropna().empty else None
    indicator_results.append(IndicatorResult(
        name="mfi",
        display_name=INDICATOR_META["mfi"]["display_name"],
        category="momentum",
        signal=signals["MFI"],
        current_value=mfi_current,
        parameters=INDICATOR_META["mfi"]["parameters"],
        description=INDICATOR_META["mfi"]["description"],
        explanation=_get_signal_explanation("mfi", signals["MFI"], mfi_current),
        chart_data=_series_to_chart_data(dates, mfi_val),
    ))

    # Secondary: ROC
    roc_val = all_indicators["roc"]
    roc_current = float(roc_val.dropna().iloc[-1]) if roc_val is not None and not roc_val.dropna().empty else None
    indicator_results.append(IndicatorResult(
        name="roc",
        display_name=INDICATOR_META["roc"]["display_name"],
        category="volume",
        signal=signals["ROC"],
        current_value=roc_current,
        parameters=INDICATOR_META["roc"]["parameters"],
        description=INDICATOR_META["roc"]["description"],
        explanation=_get_signal_explanation("roc", signals["ROC"], roc_current),
        chart_data=_series_to_chart_data(dates, roc_val),
    ))

    # ADX
    adx_val = all_indicators["adx"]
    adx_current = float(adx_val.dropna().iloc[-1]) if adx_val is not None and not adx_val.dropna().empty else None
    indicator_results.append(IndicatorResult(
        name="adx",
        display_name=INDICATOR_META["adx"]["display_name"],
        category="trend_strength",
        signal="Neutral",  # ADX doesn't generate buy/sell
        current_value=adx_current,
        parameters=INDICATOR_META["adx"]["parameters"],
        description=INDICATOR_META["adx"]["description"],
        explanation=f"ADX is at {adx_current:.1f} — {'strong trend, signals are reliable' if adx_current and adx_current > 25 else 'weak trend, signals may be less reliable' if adx_current and adx_current < 20 else 'moderate trend'}." if adx_current else "Insufficient data.",
        chart_data=_series_to_chart_data(dates, adx_val),
    ))

    # ATR
    atr_val = all_indicators["atr"]
    atr_current = float(atr_val.dropna().iloc[-1]) if atr_val is not None and not atr_val.dropna().empty else None
    indicator_results.append(IndicatorResult(
        name="atr",
        display_name=INDICATOR_META["atr"]["display_name"],
        category="volatility",
        signal="Neutral",  # ATR doesn't generate buy/sell
        current_value=atr_current,
        parameters=INDICATOR_META["atr"]["parameters"],
        description=INDICATOR_META["atr"]["description"],
        explanation=f"ATR is {atr_current:.2f} — the stock typically moves this much per day." if atr_current else "Insufficient data.",
        chart_data=_series_to_chart_data(dates, atr_val),
    ))

    # Monthly trend
    mt = all_indicators["monthly_trend"]
    monthly_trend = None
    if mt.get("signal"):
        monthly_trend = MonthlyTrendSignal(
            signal=mt["signal"],
            current_price=mt["current_price"],
            sma_value=mt["sma_value"],
            distance_percent=mt["distance_percent"],
        )

    return {
        "symbol": symbol.upper(),
        "indicators": [r.model_dump() for r in indicator_results],
        "monthly_trend": monthly_trend.model_dump() if monthly_trend else None,
        "last_updated": df.index[-1].strftime("%Y-%m-%d"),
    }


@router.get("/{symbol}/signal")
async def get_stock_signal(symbol: str):
    try:
        df = fetcher.get_price_dataframe(symbol, period="2y")
    except DataFetcherError as e:
        raise HTTPException(status_code=404, detail=str(e))

    all_indicators = calculator.compute_all(df)
    close_price = float(df["Close"].iloc[-1])

    consolidated = signal_engine.compute_consolidated(all_indicators, close_price)

    mt = all_indicators["monthly_trend"]
    monthly_trend = None
    if mt.get("signal"):
        monthly_trend = MonthlyTrendSignal(
            signal=mt["signal"],
            current_price=mt["current_price"],
            sma_value=mt["sma_value"],
            distance_percent=mt["distance_percent"],
        )

    return {
        "symbol": symbol.upper(),
        "consolidated": consolidated.model_dump(),
        "monthly_trend": monthly_trend.model_dump() if monthly_trend else None,
        "last_updated": df.index[-1].strftime("%Y-%m-%d"),
    }
