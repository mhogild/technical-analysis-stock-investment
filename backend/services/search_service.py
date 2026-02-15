import yfinance as yf
from yfinance import Search
from difflib import SequenceMatcher
from models.stock import SearchResult
from config import MAX_SEARCH_RESULTS

# Exchange suffix mappings for global exchanges
EXCHANGE_SUFFIXES = {
    "NYSE": "",
    "NASDAQ": "",
    "LSE": ".L",
    "Euronext Paris": ".PA",
    "Euronext Amsterdam": ".AS",
    "Deutsche Boerse": ".DE",
    "OMX Copenhagen": ".CO",
    "OMX Stockholm": ".ST",
    "OMX Helsinki": ".HE",
    "Tokyo": ".T",
    "Hong Kong": ".HK",
    "Shanghai": ".SS",
    "Shenzhen": ".SZ",
}


class SearchService:
    def search(self, query: str) -> list[SearchResult]:
        query = query.strip()
        if not query:
            return []

        results: list[SearchResult] = []
        seen_symbols: set[str] = set()

        # 1. Try exact ticker lookup
        self._try_exact_match(query.upper(), results, seen_symbols)

        # 2. Try with common exchange suffixes for non-US markets
        for exchange, suffix in EXCHANGE_SUFFIXES.items():
            if suffix:
                symbol_with_suffix = f"{query.upper()}{suffix}"
                self._try_exact_match(
                    symbol_with_suffix, results, seen_symbols, exchange
                )

        # 3. Use yfinance search for broader matching (by company name)
        try:
            search_obj = Search(query, max_results=MAX_SEARCH_RESULTS)
            quotes = search_obj.quotes or []
            for quote in quotes:
                symbol = quote.get("symbol", "")
                if symbol and symbol not in seen_symbols:
                    seen_symbols.add(symbol)
                    results.append(
                        SearchResult(
                            symbol=symbol,
                            name=quote.get("longname", quote.get("shortname", symbol)),
                            exchange=quote.get("exchDisp", quote.get("exchange", "Unknown")),
                            country=quote.get("country", _guess_country(symbol)),
                            market_cap=quote.get("marketCap"),
                        )
                    )
        except Exception:
            pass

        # Sort by market cap (largest first), nulls last
        results.sort(
            key=lambda r: r.market_cap if r.market_cap is not None else -1,
            reverse=True,
        )

        return results[:MAX_SEARCH_RESULTS]

    def _try_exact_match(
        self,
        symbol: str,
        results: list[SearchResult],
        seen: set[str],
        exchange_hint: str | None = None,
    ) -> None:
        if symbol in seen:
            return
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            if info and info.get("regularMarketPrice") is not None:
                seen.add(symbol)
                results.append(
                    SearchResult(
                        symbol=symbol,
                        name=info.get("longName", info.get("shortName", symbol)),
                        exchange=exchange_hint or info.get("exchange", "Unknown"),
                        country=info.get("country", _guess_country(symbol)),
                        market_cap=info.get("marketCap"),
                    )
                )
        except Exception:
            pass


def _guess_country(symbol: str) -> str:
    """Guess country from exchange suffix."""
    suffix_country = {
        ".L": "United Kingdom",
        ".PA": "France",
        ".AS": "Netherlands",
        ".DE": "Germany",
        ".CO": "Denmark",
        ".ST": "Sweden",
        ".HE": "Finland",
        ".T": "Japan",
        ".HK": "Hong Kong",
        ".SS": "China",
        ".SZ": "China",
    }
    for suffix, country in suffix_country.items():
        if symbol.endswith(suffix):
            return country
    return "United States"
