import yfinance as yf
from cache.stock_cache import StockCache

CACHE_TTL_FOREX = 86400  # 24 hours


class CurrencyService:
    def __init__(self):
        self.cache = StockCache()

    def get_rate(self, from_currency: str, to_currency: str) -> float:
        """Get exchange rate from one currency to another."""
        if from_currency == to_currency:
            return 1.0

        cache_key = f"forex_{from_currency}_{to_currency}"
        cached = self.cache.get(cache_key, "forex")
        if cached:
            return cached["rate"]

        try:
            pair = f"{from_currency}{to_currency}=X"
            ticker = yf.Ticker(pair)
            info = ticker.info
            rate = info.get("regularMarketPrice") or info.get("previousClose")

            if rate is None:
                # Try inverse pair
                pair_inv = f"{to_currency}{from_currency}=X"
                ticker_inv = yf.Ticker(pair_inv)
                info_inv = ticker_inv.info
                inv_rate = info_inv.get("regularMarketPrice") or info_inv.get(
                    "previousClose"
                )
                if inv_rate:
                    rate = 1.0 / inv_rate

            if rate is None:
                return 1.0  # Fallback

            self.cache.set(cache_key, "forex", {"rate": rate}, CACHE_TTL_FOREX)
            return rate
        except Exception:
            return 1.0  # Fallback on error

    def convert(
        self, amount: float, from_currency: str, to_currency: str
    ) -> float:
        """Convert an amount from one currency to another."""
        rate = self.get_rate(from_currency, to_currency)
        return round(amount * rate, 2)
