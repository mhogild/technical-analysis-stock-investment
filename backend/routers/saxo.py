import logging
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import RedirectResponse

from config import (
    SAXO_APP_KEY,
    SAXO_AUTH_URL,
    SAXO_REDIRECT_URI,
    SAXO_FRONTEND_REDIRECT_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)
from models.saxo import (
    SaxoAuthURL,
    SaxoConnectionStatus,
    SaxoDisconnectResponse,
    SaxoPositionsResponse,
    SaxoBalance,
    SaxoPerformance,
)
from services.saxo_token_service import SaxoTokenService
from services.saxo_portfolio_service import SaxoPortfolioService
from services.saxo_client import SaxoClient
from services.saxo_exceptions import (
    SaxoNotConnectedError,
    SaxoCircuitBreakerOpenError,
    SaxoOAuthError,
    SaxoAuthError,
    SaxoRateLimitError,
    SaxoAPIError,
)
from cache.saxo_cache import SaxoCache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/saxo", tags=["saxo"])

token_service = SaxoTokenService()
saxo_cache = SaxoCache()
portfolio_service = SaxoPortfolioService(token_service=token_service, cache=saxo_cache)


async def _get_user_id(request: Request) -> str:
    """Extract and validate user_id from Supabase JWT in Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = auth_header[7:]  # Strip "Bearer "

    # Use the shared httpx client from app.state (created in main.py lifespan)
    http_client = request.app.state.saxo_http_client
    response = await http_client.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {token}",
        },
        timeout=5.0,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    user_data = response.json()
    user_id = user_data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not extract user identity")

    return user_id


@router.get("/auth/connect", response_model=SaxoAuthURL)
async def connect_saxo(request: Request):
    """Initiate Saxo OAuth flow. Returns auth URL for frontend to redirect to."""
    user_id = await _get_user_id(request)

    state = await token_service.create_oauth_state(user_id)

    params = urlencode({
        "response_type": "code",
        "client_id": SAXO_APP_KEY,
        "redirect_uri": SAXO_REDIRECT_URI,
        "state": state,
    })
    auth_url = f"{SAXO_AUTH_URL}?{params}"

    return SaxoAuthURL(auth_url=auth_url)


@router.get("/auth/callback")
async def saxo_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """Handle OAuth callback from Saxo. Exchanges code for tokens and redirects to frontend."""
    try:
        user_id = await token_service.validate_oauth_state(state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid OAuth state: {e}")

    try:
        await token_service.exchange_code_for_tokens(code, user_id)
    except SaxoOAuthError as e:
        logger.error("Saxo OAuth token exchange failed: %s", e.error)
        raise HTTPException(status_code=502, detail=f"Saxo authentication failed: {e.error_description}")

    logger.info("Saxo OAuth flow completed for user %s", user_id)
    return RedirectResponse(url=SAXO_FRONTEND_REDIRECT_URL, status_code=302)


@router.delete("/auth/disconnect", response_model=SaxoDisconnectResponse)
async def disconnect_saxo(request: Request):
    """Disconnect Saxo account: revoke tokens and delete stored credentials."""
    user_id = await _get_user_id(request)

    try:
        await token_service.revoke_and_delete(user_id)
    except SaxoNotConnectedError:
        raise HTTPException(status_code=404, detail="No Saxo connection found")

    logger.info("Saxo disconnected for user %s", user_id)
    return SaxoDisconnectResponse(disconnected=True)


@router.get("/auth/status", response_model=SaxoConnectionStatus)
async def saxo_status(request: Request):
    """Check current Saxo connection status."""
    user_id = await _get_user_id(request)

    record = await token_service.get_token_record(user_id)

    if not record:
        return SaxoConnectionStatus(connected=False)

    return SaxoConnectionStatus(
        connected=True,
        expires_at=record.expires_at,
        saxo_client_key=record.saxo_client_key,
        circuit_breaker_tripped=record.consecutive_refresh_failures >= 2,
    )


@router.get("/portfolio/positions", response_model=SaxoPositionsResponse)
async def get_positions(request: Request):
    """Fetch Saxo portfolio positions with instrument mapping."""
    user_id = await _get_user_id(request)
    saxo_client = SaxoClient(request.app.state.saxo_http_client)

    try:
        return await portfolio_service.get_positions(user_id, saxo_client)
    except SaxoNotConnectedError:
        raise HTTPException(status_code=401, detail="Saxo account not connected")
    except SaxoCircuitBreakerOpenError:
        raise HTTPException(status_code=503, detail="Saxo connection unstable, re-authentication required")
    except SaxoAuthError:
        raise HTTPException(status_code=401, detail="Saxo authentication failed — token may be expired")
    except SaxoRateLimitError as e:
        raise HTTPException(status_code=429, detail=f"Saxo rate limit hit, retry after {e.retry_after}s")
    except SaxoAPIError as e:
        raise HTTPException(status_code=502, detail=f"Saxo API error: {e.message}")


@router.get("/portfolio/balance", response_model=SaxoBalance)
async def get_balance(request: Request):
    """Fetch Saxo account balance and cash position."""
    user_id = await _get_user_id(request)
    saxo_client = SaxoClient(request.app.state.saxo_http_client)

    try:
        return await portfolio_service.get_balance(user_id, saxo_client)
    except SaxoNotConnectedError:
        raise HTTPException(status_code=401, detail="Saxo account not connected")
    except SaxoCircuitBreakerOpenError:
        raise HTTPException(status_code=503, detail="Saxo connection unstable, re-authentication required")
    except SaxoAuthError:
        raise HTTPException(status_code=401, detail="Saxo authentication failed — token may be expired")
    except SaxoRateLimitError as e:
        raise HTTPException(status_code=429, detail=f"Saxo rate limit hit, retry after {e.retry_after}s")
    except SaxoAPIError as e:
        raise HTTPException(status_code=502, detail=f"Saxo API error: {e.message}")
