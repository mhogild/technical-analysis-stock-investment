from pydantic import BaseModel
from typing import Optional


class StockInfo(BaseModel):
    symbol: str
    name: str
    exchange: str
    country: str
    currency: str
    current_price: float
    previous_close: float
    daily_change: float
    daily_change_percent: float
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    eps: Optional[float] = None
    week_52_high: float
    week_52_low: float
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_status: str = "closed"
    last_updated: str
    is_halted: bool = False


class PricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class PriceHistory(BaseModel):
    symbol: str
    period: str
    data: list[PricePoint]


class SearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    country: str
    market_cap: Optional[float] = None
