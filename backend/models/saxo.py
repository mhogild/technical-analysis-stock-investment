from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SaxoConnectionStatus(BaseModel):
    """Response model for GET /api/saxo/auth/status."""
    connected: bool
    expires_at: Optional[datetime] = None
    saxo_client_key: Optional[str] = None
    circuit_breaker_tripped: bool = False


class SaxoAuthURL(BaseModel):
    """Response model for GET /api/saxo/auth/connect."""
    auth_url: str


class SaxoDisconnectResponse(BaseModel):
    """Response model for DELETE /api/saxo/auth/disconnect."""
    disconnected: bool


class SaxoTokenRecord(BaseModel):
    """Internal model for token data stored in Supabase. Not exposed via API."""
    id: str
    user_id: str
    access_token: str
    refresh_token: str
    token_type: str
    expires_at: datetime
    refresh_expires_at: Optional[datetime] = None
    saxo_client_key: Optional[str] = None
    consecutive_refresh_failures: int = 0
    created_at: datetime
    updated_at: datetime


class SaxoPosition(BaseModel):
    """A single Saxo portfolio position with optional Yahoo Finance mapping."""
    position_id: str
    uic: int
    asset_type: str
    saxo_symbol: str
    description: str
    amount: float
    open_price: float
    current_price: float
    profit_loss: float
    profit_loss_base_currency: float
    market_value: float
    currency: str
    exposure_currency: str
    value_date: Optional[str] = None
    yahoo_ticker: Optional[str] = None
    mapped: bool = False


class SaxoPositionsResponse(BaseModel):
    """Response model for GET /api/saxo/portfolio/positions."""
    positions: list[SaxoPosition]
    mapped_count: int
    unmapped_count: int


class SaxoBalance(BaseModel):
    """Response model for GET /api/saxo/portfolio/balance."""
    total_value: float
    cash_balance: float
    unrealized_positions_value: float
    currency: str
    margin_used: float
    margin_available: float
    change_today: float


class SaxoPerformance(BaseModel):
    """Response model for GET /api/saxo/portfolio/performance."""
    total_value: float
    cash_balance: float
    unrealized_positions_value: float
    change_today: float
    change_today_percent: float
    currency: str


class SaxoClientInfo(BaseModel):
    """Internal model for cached Saxo client bootstrap data."""
    client_key: str
    default_account_key: str
    default_account_id: str
    name: str
    default_currency: str


class SaxoInstrumentMapping(BaseModel):
    """Model for an instrument mapping record (Supabase saxo_instrument_map row)."""
    uic: int
    asset_type: str
    saxo_symbol: str
    saxo_exchange: Optional[str] = None
    yahoo_ticker: Optional[str] = None
    mapped: bool = False
