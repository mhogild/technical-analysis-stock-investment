from pydantic import BaseModel
from typing import Literal


IndustryType = Literal["stock_industry", "etf_category"]


class Industry(BaseModel):
    """Industry or ETF category for filtering."""
    id: str
    name: str
    type: IndustryType
    icon: str = ""


class IndustriesResponse(BaseModel):
    """Response for the industries endpoint."""
    stock_industries: list[Industry]
    etf_categories: list[Industry]
