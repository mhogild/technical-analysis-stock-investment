"""Service for computing and managing stock recommendations."""

import logging
from datetime import datetime
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from cache.stock_cache import StockCache
from services.data_fetcher import DataFetcher, DataFetcherError
from services.indicator_calculator import IndicatorCalculator
from services.signal_engine import SignalEngine
from services.industry_service import IndustryService
from models.recommendation import Recommendation, RecommendationsResponse

logger = logging.getLogger(__name__)

# Cache TTL for recommendations (1 hour)
RECOMMENDATIONS_CACHE_TTL = 60 * 60

# Popular stocks and ETFs to scan for recommendations
# This is a curated list of liquid, large-cap stocks and major ETFs
UNIVERSE_STOCKS = [
    # US Large Cap Tech
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL",
    "ADBE", "CRM", "AMD", "INTC", "CSCO", "QCOM", "TXN", "IBM", "AMAT", "ADI",
    "MU", "LRCX", "KLAC", "SNPS", "CDNS", "PANW", "CRWD", "NOW", "SNOW", "DDOG",
    # US Large Cap Healthcare
    "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY",
    "AMGN", "GILD", "ISRG", "VRTX", "REGN", "MDT", "SYK", "ZTS", "BDX", "EW",
    # US Large Cap Financials
    "BRK-B", "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "SCHW", "AXP",
    "BLK", "C", "SPGI", "CME", "ICE", "PGR", "AON", "MMC", "CB", "MET",
    # US Large Cap Consumer
    "WMT", "HD", "PG", "KO", "PEP", "COST", "MCD", "NKE", "SBUX", "TGT",
    "LOW", "TJX", "BKNG", "MAR", "ORLY", "DG", "ROST", "CMG", "YUM", "DHI",
    # US Large Cap Industrials
    "CAT", "DE", "UNP", "HON", "UPS", "RTX", "BA", "LMT", "GE", "MMM",
    "ETN", "EMR", "ITW", "PH", "ROK", "CMI", "PCAR", "FDX", "NSC", "CSX",
    # US Large Cap Energy
    "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "PXD",
    # US Large Cap Utilities & Real Estate
    "NEE", "DUK", "SO", "D", "AEP", "SRE", "XEL", "ES", "WEC", "EXC",
    "AMT", "PLD", "CCI", "EQIX", "PSA", "SPG", "O", "WELL", "DLR", "AVB",
    # US Large Cap Communications
    "DIS", "NFLX", "CMCSA", "T", "VZ", "TMUS", "CHTR", "EA", "TTWO", "WBD",
]

UNIVERSE_ETFS = [
    # Broad Market ETFs
    "SPY", "VOO", "IVV", "VTI", "QQQ", "DIA", "IWM", "IWF", "IWD", "VTV",
    "VUG", "SCHD", "VIG", "DGRO", "NOBL",
    # Sector ETFs
    "XLK", "XLF", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE",
    "XLC", "VGT", "VFH", "VHT", "VNQ",
    # International ETFs
    "EFA", "EEM", "VEA", "VWO", "IEFA", "IEMG", "VXUS", "ACWI",
    # Bond ETFs
    "BND", "AGG", "LQD", "TLT", "IEF", "SHY", "VCIT", "VCSH", "HYG", "JNK",
    # Thematic/Innovation ETFs
    "ARKK", "ARKW", "ARKG", "BOTZ", "ROBO", "QCLN", "ICLN", "LIT", "SOXX", "SMH",
    # Commodity ETFs
    "GLD", "SLV", "USO", "UNG", "DBC", "PDBC",
]


class RecommendationsService:
    """Service for generating and managing stock recommendations."""

    def __init__(self):
        self.cache = StockCache()
        self.data_fetcher = DataFetcher()
        self.indicator_calc = IndicatorCalculator()
        self.signal_engine = SignalEngine()
        self.industry_service = IndustryService()

    def get_recommendations(
        self,
        limit: int = 100,
        industries: list[str] | None = None,
        etf_only: bool = False,
    ) -> RecommendationsResponse:
        """
        Get top buy signal recommendations.

        Args:
            limit: Maximum number of recommendations to return
            industries: Optional list of industry IDs to filter by
            etf_only: If True, only return ETFs

        Returns:
            RecommendationsResponse with ranked recommendations
        """
        # Build cache key
        cache_key = f"recommendations_{limit}_{','.join(sorted(industries or []))}_{etf_only}"

        # Check cache first
        cached = self.cache.get("_recommendations", cache_key)
        if cached:
            return RecommendationsResponse(**cached)

        # Get all recommendations (either from pre-computed cache or compute fresh)
        all_recommendations = self._get_all_buy_signals()

        # Apply filters
        filtered = all_recommendations

        if etf_only:
            filtered = [r for r in filtered if r.is_etf]

        if industries:
            filtered = [r for r in filtered if r.industry in industries]

        # Re-rank after filtering
        for i, rec in enumerate(filtered[:limit], start=1):
            rec.rank = i

        response = RecommendationsResponse(
            items=filtered[:limit],
            total_count=len(filtered),
            filtered_by=industries,
            etf_only=etf_only,
            last_updated=datetime.now().isoformat(),
        )

        # Cache the response
        self.cache.set("_recommendations", cache_key, response.model_dump(), RECOMMENDATIONS_CACHE_TTL)

        return response

    def _get_all_buy_signals(self) -> list[Recommendation]:
        """Get all stocks/ETFs with buy signals, sorted by score."""
        # Check if we have a recent full scan
        cached = self.cache.get("_recommendations", "_all_buy_signals")
        if cached:
            return [Recommendation(**r) for r in cached]

        # Compute fresh recommendations
        recommendations = []

        # Process stocks and ETFs
        universe = [(sym, False) for sym in UNIVERSE_STOCKS] + [(sym, True) for sym in UNIVERSE_ETFS]

        # Use thread pool for parallel processing
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(self._compute_recommendation, symbol, is_etf): (symbol, is_etf)
                for symbol, is_etf in universe
            }

            for future in as_completed(futures):
                symbol, is_etf = futures[future]
                try:
                    rec = future.result()
                    if rec and rec.consolidated_signal in ("Buy", "Strong Buy"):
                        recommendations.append(rec)
                except Exception as e:
                    logger.warning(f"Failed to compute recommendation for {symbol}: {e}")

        # Sort by signal score (highest first)
        recommendations.sort(key=lambda r: r.signal_score, reverse=True)

        # Assign ranks
        for i, rec in enumerate(recommendations, start=1):
            rec.rank = i

        # Cache the full list
        self.cache.set(
            "_recommendations",
            "_all_buy_signals",
            [r.model_dump() for r in recommendations],
            RECOMMENDATIONS_CACHE_TTL,
        )

        return recommendations

    def _compute_recommendation(self, symbol: str, is_etf: bool) -> Optional[Recommendation]:
        """Compute recommendation for a single symbol."""
        try:
            # Get stock info
            stock_info = self.data_fetcher.get_stock_info(symbol)

            # Get price data
            df = self.data_fetcher.get_price_dataframe(symbol, period="1y")
            if df is None or len(df) < 50:
                return None

            # Compute indicators
            indicators = self.indicator_calc.compute_all(df)

            # Compute consolidated signal
            close_price = float(df["Close"].iloc[-1])
            consolidated = self.signal_engine.compute_consolidated(indicators, close_price)

            # Only include Buy or Strong Buy
            if consolidated.signal not in ("Buy", "Strong Buy"):
                return None

            # Classify industry
            if is_etf:
                industry = self.industry_service.classify_etf(stock_info.name, stock_info.sector)
            else:
                industry = self.industry_service.classify_stock(stock_info.sector, stock_info.industry)

            return Recommendation(
                rank=0,  # Will be set later
                symbol=symbol,
                name=stock_info.name or symbol,
                exchange=stock_info.exchange or "Unknown",
                is_etf=is_etf,
                industry=industry,
                consolidated_signal=consolidated.signal,
                signal_score=consolidated.score,
                last_price=stock_info.current_price or close_price,
                daily_change_percent=stock_info.daily_change_percent,
                market_cap=stock_info.market_cap,
            )

        except DataFetcherError as e:
            logger.debug(f"Data fetch error for {symbol}: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error computing recommendation for {symbol}: {e}")
            return None

    def refresh_recommendations(self) -> int:
        """
        Force refresh of all recommendations.
        Returns the number of buy signals found.
        """
        # Clear cached recommendations
        self.cache.invalidate("_recommendations", "_all_buy_signals")

        # Recompute
        recommendations = self._get_all_buy_signals()
        return len(recommendations)
