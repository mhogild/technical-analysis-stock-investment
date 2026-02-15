from pydantic import BaseModel
from typing import Optional, Literal


ConsolidatedLevel = Literal["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"]


class Recommendation(BaseModel):
    """A single recommendation in the top buy signals list."""
    rank: int
    symbol: str
    name: str
    exchange: str
    is_etf: bool = False
    industry: Optional[str] = None
    consolidated_signal: ConsolidatedLevel
    signal_score: float
    last_price: float
    daily_change_percent: Optional[float] = None
    market_cap: Optional[float] = None


class RecommendationsResponse(BaseModel):
    """Response for the recommendations endpoint."""
    items: list[Recommendation]
    total_count: int
    filtered_by: Optional[list[str]] = None
    etf_only: bool = False
    last_updated: str
