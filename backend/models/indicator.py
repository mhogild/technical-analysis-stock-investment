from pydantic import BaseModel
from typing import Optional, Literal


SignalType = Literal["Buy", "Sell", "Neutral"]
CategoryType = Literal["momentum", "trend", "volatility", "volume", "trend_strength"]


class IndicatorChartData(BaseModel):
    dates: list[str]
    values: list[Optional[float]]
    extra_series: dict[str, list[Optional[float]]] = {}


class IndicatorResult(BaseModel):
    name: str
    display_name: str
    category: CategoryType
    signal: SignalType
    current_value: Optional[float] = None
    parameters: dict[str, int | float | str]
    description: str
    explanation: str
    chart_data: IndicatorChartData
