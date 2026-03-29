"""Saxo OpenAPI HTTP client with token injection, rate limiting, retries, and error normalization."""
import logging
from typing import Any, Dict, Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception,
)

from config import SAXO_BASE_URL
from services.saxo_exceptions import (
    SaxoAPIError,
    SaxoAuthError,
    SaxoRateLimitError,
    SaxoError,
)

logger = logging.getLogger(__name__)


def _is_retryable(exc: Exception) -> bool:
    """Determine if an exception is retryable."""
    if isinstance(exc, SaxoRateLimitError):
        return True
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 502, 503)
    return False


class SaxoClient:
    """HTTP client wrapper for Saxo OpenAPI with automatic token injection,
    rate limit handling, retries, and error normalization.

    Usage:
        client = SaxoClient(http_client)
        data = await client.get(access_token, "/port/v1/clients/me")
    """

    def __init__(self, http_client: httpx.AsyncClient):
        self._http = http_client
        self._base_url = SAXO_BASE_URL

    @retry(
        retry=retry_if_exception(_is_retryable),
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=10),
    )
    async def get(
        self,
        access_token: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make a GET request to Saxo OpenAPI.

        Args:
            access_token: Decrypted Bearer token (plaintext, in-memory only).
            path: API path (e.g., "/port/v1/clients/me").
            params: Optional query parameters.

        Returns:
            Parsed JSON response as dict.

        Raises:
            SaxoAuthError: On 401 response.
            SaxoRateLimitError: On 429 response (will be retried by tenacity).
            SaxoAPIError: On other non-2xx responses.
        """
        url = f"{self._base_url}{path}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        response = await self._http.get(
            url,
            headers=headers,
            params=params,
            timeout=10.0,
        )

        return self._handle_response(response)

    @retry(
        retry=retry_if_exception(_is_retryable),
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=10),
    )
    async def post(
        self,
        access_token: str,
        path: str,
        json_body: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make a POST request to Saxo OpenAPI."""
        url = f"{self._base_url}{path}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        response = await self._http.post(
            url,
            headers=headers,
            json=json_body,
            timeout=10.0,
        )

        return self._handle_response(response)

    def _handle_response(self, response: httpx.Response) -> Dict[str, Any]:
        """Parse response, log rate limit headers, raise typed exceptions on errors."""
        # Log rate limit headers (never log tokens)
        remaining = response.headers.get("X-RateLimit-Remaining")
        if remaining is not None:
            logger.debug("Saxo rate limit remaining: %s", remaining)

        if response.status_code == 200:
            if not response.content:
                return {}
            return response.json()

        if response.status_code == 204:
            return {}

        if response.status_code == 401:
            raise SaxoAuthError("Saxo returned 401 Unauthorized")

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "1"))
            logger.warning("Saxo rate limit hit. Retry-After: %ds", retry_after)
            raise SaxoRateLimitError(retry_after)

        # Parse Saxo error body — two possible shapes:
        # API errors: {"ErrorCode": "...", "Message": "..."}
        # OAuth errors: {"error": "...", "error_description": "..."}
        try:
            body = response.json()
        except Exception:
            raise SaxoAPIError(
                error_code="UnparsableResponse",
                message=response.text[:200],
                status_code=response.status_code,
            )

        error_code = body.get("ErrorCode", body.get("error", "Unknown"))
        message = body.get("Message", body.get("error_description", "No details"))

        raise SaxoAPIError(
            error_code=str(error_code),
            message=str(message),
            status_code=response.status_code,
        )
