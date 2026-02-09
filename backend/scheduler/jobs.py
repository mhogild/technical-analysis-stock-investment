"""Scheduled jobs for signal updates and notifications."""

from datetime import date
from services.data_fetcher import DataFetcher
from services.indicator_calculator import IndicatorCalculator
from services.signal_engine import SignalEngine


def run_signal_update(supabase_client, notification_service):
    """
    Iterate all stocks with watchlist/portfolio entries,
    compute current signals, store in history, and dispatch notifications.
    """
    fetcher = DataFetcher()
    calculator = IndicatorCalculator()
    signal_engine = SignalEngine()

    # Gather all unique symbols from watchlist and portfolio
    watchlist = (
        supabase_client.table("watchlist_entries")
        .select("symbol, exchange")
        .execute()
    )
    portfolio = (
        supabase_client.table("portfolio_positions")
        .select("symbol, exchange")
        .execute()
    )

    symbols = {}
    for row in (watchlist.data or []) + (portfolio.data or []):
        symbols[row["symbol"]] = row.get("exchange", "")

    today = date.today().isoformat()

    for symbol, exchange in symbols.items():
        try:
            df = fetcher.get_price_dataframe(symbol, period="2y")
            all_indicators = calculator.compute_all(df)
            close_price = float(df["Close"].iloc[-1])
            consolidated = signal_engine.compute_consolidated(
                all_indicators, close_price
            )

            new_signal = consolidated.signal
            new_score = consolidated.score

            # Check for signal change
            change = notification_service.check_signal_changes(
                symbol, new_signal, new_score
            )

            # Store in signal history
            supabase_client.table("signal_history").upsert(
                {
                    "symbol": symbol,
                    "exchange": exchange,
                    "date": today,
                    "consolidated_signal": new_signal,
                    "consolidated_score": float(new_score),
                    "indicator_signals": consolidated.individual_signals,
                },
                on_conflict="symbol,exchange,date",
            ).execute()

            # Send notifications if signal changed
            if change:
                notification_service.create_notifications(
                    symbol=symbol,
                    exchange=exchange,
                    old_signal=change["previous_signal"],
                    new_signal=change["new_signal"],
                    explanation=consolidated.explanation,
                )

        except Exception:
            continue  # Skip failed symbols
