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
