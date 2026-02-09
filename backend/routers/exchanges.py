from fastapi import APIRouter
from datetime import datetime, time
from zoneinfo import ZoneInfo

router = APIRouter(prefix="/api/exchanges", tags=["exchanges"])

# Exchange trading hours: (timezone, open_time, close_time, pre_market_start, after_hours_end)
EXCHANGE_HOURS = {
    "NYSE": {
        "timezone": "America/New_York",
        "open": time(9, 30),
        "close": time(16, 0),
        "pre_market": time(4, 0),
        "after_hours": time(20, 0),
    },
    "NASDAQ": {
        "timezone": "America/New_York",
        "open": time(9, 30),
        "close": time(16, 0),
        "pre_market": time(4, 0),
        "after_hours": time(20, 0),
    },
    "NMS": {
        "timezone": "America/New_York",
        "open": time(9, 30),
        "close": time(16, 0),
        "pre_market": time(4, 0),
        "after_hours": time(20, 0),
    },
    "NGM": {
        "timezone": "America/New_York",
        "open": time(9, 30),
        "close": time(16, 0),
        "pre_market": time(4, 0),
        "after_hours": time(20, 0),
    },
    "LSE": {
        "timezone": "Europe/London",
        "open": time(8, 0),
        "close": time(16, 30),
        "pre_market": time(7, 0),
        "after_hours": time(17, 30),
    },
    "PAR": {
        "timezone": "Europe/Paris",
        "open": time(9, 0),
        "close": time(17, 30),
        "pre_market": time(7, 15),
        "after_hours": time(17, 45),
    },
    "AMS": {
        "timezone": "Europe/Amsterdam",
        "open": time(9, 0),
        "close": time(17, 30),
        "pre_market": time(7, 15),
        "after_hours": time(17, 45),
    },
    "FRA": {
        "timezone": "Europe/Berlin",
        "open": time(8, 0),
        "close": time(20, 0),
        "pre_market": None,
        "after_hours": None,
    },
    "XETRA": {
        "timezone": "Europe/Berlin",
        "open": time(9, 0),
        "close": time(17, 30),
        "pre_market": time(8, 0),
        "after_hours": None,
    },
    "CPH": {
        "timezone": "Europe/Copenhagen",
        "open": time(9, 0),
        "close": time(17, 0),
        "pre_market": None,
        "after_hours": None,
    },
    "STO": {
        "timezone": "Europe/Stockholm",
        "open": time(9, 0),
        "close": time(17, 30),
        "pre_market": None,
        "after_hours": None,
    },
    "HEL": {
        "timezone": "Europe/Helsinki",
        "open": time(10, 0),
        "close": time(18, 30),
        "pre_market": None,
        "after_hours": None,
    },
    "TSE": {
        "timezone": "Asia/Tokyo",
        "open": time(9, 0),
        "close": time(15, 0),
        "pre_market": None,
        "after_hours": None,
    },
    "HKSE": {
        "timezone": "Asia/Hong_Kong",
        "open": time(9, 30),
        "close": time(16, 0),
        "pre_market": None,
        "after_hours": None,
    },
    "SSE": {
        "timezone": "Asia/Shanghai",
        "open": time(9, 30),
        "close": time(15, 0),
        "pre_market": None,
        "after_hours": None,
    },
    "SZSE": {
        "timezone": "Asia/Shanghai",
        "open": time(9, 30),
        "close": time(15, 0),
        "pre_market": None,
        "after_hours": None,
    },
}


def get_exchange_status(exchange: str) -> dict:
    """Determine current market status for an exchange."""
    config = EXCHANGE_HOURS.get(exchange)
    if not config:
        return {"exchange": exchange, "status": "closed", "timezone": "Unknown"}

    tz = ZoneInfo(config["timezone"])
    now = datetime.now(tz)
    current_time = now.time()

    # Weekends are always closed
    if now.weekday() >= 5:
        return {
            "exchange": exchange,
            "status": "closed",
            "timezone": config["timezone"],
            "open": config["open"].strftime("%H:%M"),
            "close": config["close"].strftime("%H:%M"),
        }

    status = "closed"
    if config["open"] <= current_time <= config["close"]:
        status = "open"
    elif config.get("pre_market") and config["pre_market"] <= current_time < config["open"]:
        status = "pre-market"
    elif config.get("after_hours") and config["close"] < current_time <= config["after_hours"]:
        status = "after-hours"

    return {
        "exchange": exchange,
        "status": status,
        "timezone": config["timezone"],
        "open": config["open"].strftime("%H:%M"),
        "close": config["close"].strftime("%H:%M"),
    }


@router.get("/status")
async def get_all_exchange_status():
    """Return market status for all supported exchanges."""
    return {
        exchange: get_exchange_status(exchange)
        for exchange in EXCHANGE_HOURS
    }


@router.get("/status/{exchange}")
async def get_single_exchange_status(exchange: str):
    """Return market status for a single exchange."""
    return get_exchange_status(exchange.upper())
