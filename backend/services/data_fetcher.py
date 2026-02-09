import yfinance as yf
import pandas as pd
from datetime import datetime
from typing import Optional
from models.stock import StockInfo, PricePoint
from cache.stock_cache import StockCache
from config import CACHE_TTL_PRICE, CACHE_TTL_INFO
from routers.exchanges import get_exchange_status


class DataFetcherError(Exception):
    pass


class DataFetcher:
    def __init__(self):
        self.cache = StockCache()

    def get_stock_info(self, symbol: str) -> StockInfo:
        cached = self.cache.get(symbol, "info")
        if cached:
            return StockInfo(**cached)

        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
        except Exception as e:
            raise DataFetcherError(f"Failed to fetch data for {symbol}: {e}")

        if not info or info.get("regularMarketPrice") is None:
            raise DataFetcherError(f"No data found for symbol: {symbol}")

        current_price = info.get("regularMarketPrice", 0) or info.get("currentPrice", 0)
        previous_close = info.get("regularMarketPreviousClose", 0) or info.get("previousClose", 0)
        daily_change = current_price - previous_close if previous_close else 0
        daily_change_pct = (daily_change / previous_close * 100) if previous_close else 0

        stock_info = StockInfo(
            symbol=symbol.upper(),
            name=info.get("longName", info.get("shortName", symbol)),
            exchange=info.get("exchange", "Unknown"),
            country=info.get("country", "Unknown"),
            currency=info.get("currency", "USD"),
            current_price=current_price,
            previous_close=previous_close,
            daily_change=round(daily_change, 2),
            daily_change_percent=round(daily_change_pct, 2),
            market_cap=info.get("marketCap"),
            pe_ratio=info.get("trailingPE"),
            dividend_yield=info.get("dividendYield"),
            eps=info.get("trailingEps"),
            week_52_high=info.get("fiftyTwoWeekHigh", 0),
            week_52_low=info.get("fiftyTwoWeekLow", 0),
            sector=info.get("sector"),
            industry=info.get("industry"),
            market_status=get_exchange_status(info.get("exchange", "")).get("status", "closed"),
            last_updated=datetime.now().isoformat(),
            is_halted=info.get("marketState") == "HALT" or info.get("tradeable", True) is False,
        )

        self.cache.set(symbol, "info", stock_info.model_dump(), CACHE_TTL_INFO)
        return stock_info

    def get_price_history(
        self, symbol: str, period: str = "1y"
    ) -> list[PricePoint]:
        cache_key = f"history_{period}"
        cached = self.cache.get(symbol, cache_key)
        if cached:
            return [PricePoint(**p) for p in cached]

        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period)
        except Exception as e:
            raise DataFetcherError(f"Failed to fetch history for {symbol}: {e}")

        if df.empty:
            raise DataFetcherError(f"No price history for symbol: {symbol}")

        points = []
        for date, row in df.iterrows():
            points.append(
                PricePoint(
                    date=date.strftime("%Y-%m-%d"),
                    open=round(row["Open"], 2),
                    high=round(row["High"], 2),
                    low=round(row["Low"], 2),
                    close=round(row["Close"], 2),
                    volume=int(row["Volume"]),
                )
            )

        self.cache.set(
            symbol,
            cache_key,
            [p.model_dump() for p in points],
            CACHE_TTL_PRICE,
        )
        return points

    def get_price_dataframe(
        self, symbol: str, period: str = "1y"
    ) -> pd.DataFrame:
        """Get price history as a pandas DataFrame for indicator computation."""
        cache_key = f"df_{period}"
        cached = self.cache.get(symbol, cache_key)
        if cached:
            df = pd.DataFrame(cached)
            df["Date"] = pd.to_datetime(df["Date"], utc=True)
            df.set_index("Date", inplace=True)
            return df

        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period)
        except Exception as e:
            raise DataFetcherError(f"Failed to fetch history for {symbol}: {e}")

        if df.empty:
            raise DataFetcherError(f"No price history for symbol: {symbol}")

        # Convert to UTC and store with consistent format
        df_for_cache = df.copy()
        df_for_cache.index = df_for_cache.index.tz_convert('UTC')
        cache_data = df_for_cache.reset_index().to_dict("records")
        for row in cache_data:
            row["Date"] = row["Date"].strftime("%Y-%m-%d %H:%M:%S+00:00")
        self.cache.set(symbol, cache_key, cache_data, CACHE_TTL_PRICE)

        return df

    def get_financials(self, symbol: str) -> dict:
        """Get key financial metrics."""
        info = self.get_stock_info(symbol)
        return {
            "market_cap": info.market_cap,
            "pe_ratio": info.pe_ratio,
            "dividend_yield": info.dividend_yield,
            "eps": info.eps,
            "week_52_high": info.week_52_high,
            "week_52_low": info.week_52_low,
            "sector": info.sector,
            "industry": info.industry,
        }
