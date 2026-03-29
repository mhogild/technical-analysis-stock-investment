"""Typed exception hierarchy for Saxo OpenAPI integration.

All Saxo-related errors are normalized into these exceptions before
reaching route handlers. Routes catch specific types and translate
to HTTPException with appropriate status codes.
"""


class SaxoError(Exception):
    """Base class for all Saxo integration errors."""
    pass


class SaxoNotConnectedError(SaxoError):
    """User has no Saxo token stored."""
    def __init__(self, user_id: str):
        self.user_id = user_id
        super().__init__(f"No Saxo connection found for user {user_id}")


class SaxoCircuitBreakerOpenError(SaxoError):
    """Too many consecutive refresh failures; user must re-authenticate."""
    def __init__(self, user_id: str):
        self.user_id = user_id
        super().__init__(
            f"Saxo token refresh circuit breaker open for user {user_id}. "
            "Re-authentication required."
        )


class SaxoTokenExpiredError(SaxoError):
    """Token expired and could not be refreshed."""
    pass


class SaxoRateLimitError(SaxoError):
    """Saxo returned 429; includes retry_after seconds."""
    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(f"Saxo rate limit exceeded. Retry after {retry_after}s.")


class SaxoAuthError(SaxoError):
    """Saxo returned 401; token may be invalid."""
    pass


class SaxoAPIError(SaxoError):
    """Saxo returned a non-2xx response with an error body."""
    def __init__(self, error_code: str, message: str, status_code: int):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        super().__init__(f"Saxo API error {status_code}: [{error_code}] {message}")


class SaxoOAuthError(SaxoError):
    """OAuth token endpoint returned an error (e.g., invalid_grant)."""
    def __init__(self, error: str, error_description: str = ""):
        self.error = error
        self.error_description = error_description
        super().__init__(f"Saxo OAuth error: {error} - {error_description}")
