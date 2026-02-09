from pydantic import BaseModel
from typing import Optional, Literal


ConsolidatedLevel = Literal["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"]
MonthlyTrendLevel = Literal["Invested", "Caution"]
ConfidenceLevel = Literal["high", "moderate", "low"]
SignalType = Literal["Buy", "Sell", "Neutral"]


class MonthlyTrendSignal(BaseModel):
    signal: MonthlyTrendLevel
    current_price: float
    sma_value: float
    distance_percent: float


class ConsolidatedSignal(BaseModel):
    signal: ConsolidatedLevel
    score: float
    explanation: str
    adx_value: Optional[float] = None
    adx_confidence: ConfidenceLevel
    individual_signals: dict[str, SignalType]
    buy_count: int
    sell_count: int
    neutral_count: int


class SignalExplanation(BaseModel):
    summary: str
    agreeing_indicators: list[str]
    conflicting_indicators: list[str]
    adx_note: str
