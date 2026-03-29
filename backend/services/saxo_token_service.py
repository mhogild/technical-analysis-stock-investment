import asyncio
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import httpx
from cryptography.fernet import Fernet

from config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SAXO_APP_KEY,
    SAXO_APP_SECRET,
    SAXO_REDIRECT_URI,
    SAXO_TOKEN_URL,
    SAXO_TOKEN_ENCRYPTION_KEY,
    SAXO_REFRESH_BUFFER_SECONDS,
    SAXO_CIRCUIT_BREAKER_LIMIT,
)
from models.saxo import SaxoTokenRecord
from services.saxo_exceptions import (
    SaxoNotConnectedError,
    SaxoCircuitBreakerOpenError,
    SaxoTokenExpiredError,
    SaxoOAuthError,
)

logger = logging.getLogger(__name__)


class SaxoTokenService:
    def __init__(self):
        self._fernet = Fernet(SAXO_TOKEN_ENCRYPTION_KEY.encode())
        self._refresh_locks: Dict[str, asyncio.Lock] = {}
        self._supabase_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def _decrypt(self, ciphertext: str) -> str:
        return self._fernet.decrypt(ciphertext.encode()).decode()

    def _get_lock(self, user_id: str) -> asyncio.Lock:
        if user_id not in self._refresh_locks:
            self._refresh_locks[user_id] = asyncio.Lock()
        return self._refresh_locks[user_id]

    async def create_oauth_state(self, user_id: str) -> str:
        """Generate a CSRF state token and store it in Supabase with a 10-minute TTL."""
        state = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        payload = {
            "state": state,
            "user_id": user_id,
            "expires_at": expires_at.isoformat(),
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_URL}/rest/v1/saxo_oauth_state",
                json=payload,
                headers=self._supabase_headers,
            )
            if not response.is_success:
                raise RuntimeError(
                    f"Failed to store OAuth state for user {user_id}: "
                    f"{response.status_code} {response.text}"
                )

        logger.info("Created OAuth state for user %s", user_id)
        return state

    async def validate_oauth_state(self, state: str) -> str:
        """Validate the CSRF state token, delete it, and return the associated user_id."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/saxo_oauth_state",
                params={"state": f"eq.{state}"},
                headers=self._supabase_headers,
            )
            if not response.is_success:
                raise RuntimeError(
                    f"Failed to fetch OAuth state: {response.status_code} {response.text}"
                )

            rows = response.json()
            if not rows:
                raise ValueError(f"OAuth state not found: {state}")

            row = rows[0]
            expires_at = datetime.fromisoformat(row["expires_at"])
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if expires_at < datetime.now(timezone.utc):
                raise ValueError(f"OAuth state expired: {state}")

            user_id = row["user_id"]

            # Delete the state row (one-time use)
            delete_response = await client.delete(
                f"{SUPABASE_URL}/rest/v1/saxo_oauth_state",
                params={"state": f"eq.{state}"},
                headers=self._supabase_headers,
            )
            if not delete_response.is_success:
                raise RuntimeError(
                    f"Failed to delete OAuth state {state}: "
                    f"{delete_response.status_code} {delete_response.text}"
                )

        logger.info("Validated and consumed OAuth state for user %s", user_id)
        return user_id

    async def exchange_code_for_tokens(self, code: str, user_id: str) -> None:
        """Exchange an authorization code for access and refresh tokens, then persist them."""
        form_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": SAXO_REDIRECT_URI,
            "client_id": SAXO_APP_KEY,
            "client_secret": SAXO_APP_SECRET,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                SAXO_TOKEN_URL,
                data=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_data = response.json()

        if "error" in token_data:
            raise SaxoOAuthError(
                token_data.get("error", "unknown_error"),
                token_data.get("error_description", ""),
            )

        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]
        expires_in = int(token_data["expires_in"])
        refresh_expires_in = token_data.get("refresh_token_expires_in")

        encrypted_access = self._encrypt(access_token)
        encrypted_refresh = self._encrypt(refresh_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=expires_in)
        refresh_expires_at = (
            now + timedelta(seconds=int(refresh_expires_in))
            if refresh_expires_in is not None
            else None
        )

        upsert_payload = {
            "user_id": user_id,
            "access_token": encrypted_access,
            "refresh_token": encrypted_refresh,
            "token_type": token_data.get("token_type", "Bearer"),
            "expires_at": expires_at.isoformat(),
            "refresh_expires_at": refresh_expires_at.isoformat() if refresh_expires_at else None,
            "consecutive_refresh_failures": 0,
            "updated_at": now.isoformat(),
        }

        upsert_headers = {
            **self._supabase_headers,
            "Prefer": "resolution=merge-duplicates,return=representation",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_URL}/rest/v1/saxo_tokens",
                json=upsert_payload,
                headers=upsert_headers,
            )
            if not response.is_success:
                raise RuntimeError(
                    f"Failed to store tokens for user {user_id}: "
                    f"{response.status_code} {response.text}"
                )

        logger.info("Exchanged authorization code for tokens for user %s", user_id)

    async def get_token_record(self, user_id: str) -> Optional[SaxoTokenRecord]:
        """Fetch the token record for a user from Supabase. Returns None if not found."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/saxo_tokens",
                params={"user_id": f"eq.{user_id}"},
                headers=self._supabase_headers,
            )
            if not response.is_success:
                raise RuntimeError(
                    f"Failed to fetch token record for user {user_id}: "
                    f"{response.status_code} {response.text}"
                )

            rows = response.json()
            if not rows:
                return None

            return SaxoTokenRecord(**rows[0])

    async def get_valid_token(self, user_id: str) -> str:
        """Return a valid plaintext access token, refreshing proactively if near expiry."""
        record = await self.get_token_record(user_id)
        if not record:
            raise SaxoNotConnectedError(user_id)

        if record.consecutive_refresh_failures >= SAXO_CIRCUIT_BREAKER_LIMIT:
            raise SaxoCircuitBreakerOpenError(user_id)

        now = datetime.now(timezone.utc)
        buffer = timedelta(seconds=SAXO_REFRESH_BUFFER_SECONDS)

        if record.expires_at - now < buffer:
            async with self._get_lock(user_id):
                # Re-fetch after acquiring lock (another coroutine may have refreshed)
                record = await self.get_token_record(user_id)
                if not record:
                    raise SaxoNotConnectedError(user_id)
                if record.consecutive_refresh_failures >= SAXO_CIRCUIT_BREAKER_LIMIT:
                    raise SaxoCircuitBreakerOpenError(user_id)
                if record.expires_at - now < buffer:
                    await self._refresh_and_store(user_id, record)
                    record = await self.get_token_record(user_id)

        return self._decrypt(record.access_token)

    async def _refresh_and_store(self, user_id: str, record: SaxoTokenRecord) -> None:
        """Refresh the access token using the refresh token, update Supabase, manage circuit breaker."""
        plaintext_refresh = self._decrypt(record.refresh_token)

        form_data = {
            "grant_type": "refresh_token",
            "refresh_token": plaintext_refresh,
            "client_id": SAXO_APP_KEY,
            "client_secret": SAXO_APP_SECRET,
        }

        now = datetime.now(timezone.utc)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    SAXO_TOKEN_URL,
                    data=form_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                token_data = response.json()

            if "error" in token_data:
                raise SaxoOAuthError(
                    token_data.get("error", "unknown_error"),
                    token_data.get("error_description", ""),
                )

            if not response.is_success:
                raise RuntimeError(
                    f"Token refresh failed with status {response.status_code}: {response.text}"
                )

            new_access = token_data["access_token"]
            new_refresh = token_data["refresh_token"]
            expires_in = int(token_data["expires_in"])
            refresh_expires_in = token_data.get("refresh_token_expires_in")

            encrypted_access = self._encrypt(new_access)
            encrypted_refresh = self._encrypt(new_refresh)

            expires_at = now + timedelta(seconds=expires_in)
            refresh_expires_at = (
                now + timedelta(seconds=int(refresh_expires_in))
                if refresh_expires_in is not None
                else None
            )

            patch_payload = {
                "access_token": encrypted_access,
                "refresh_token": encrypted_refresh,
                "expires_at": expires_at.isoformat(),
                "refresh_expires_at": refresh_expires_at.isoformat() if refresh_expires_at else None,
                "consecutive_refresh_failures": 0,
                "updated_at": now.isoformat(),
            }

            patch_headers = {
                **self._supabase_headers,
                "Prefer": "return=representation",
            }

            async with httpx.AsyncClient() as client:
                patch_response = await client.patch(
                    f"{SUPABASE_URL}/rest/v1/saxo_tokens",
                    json=patch_payload,
                    params={"user_id": f"eq.{user_id}"},
                    headers=patch_headers,
                )
                if not patch_response.is_success:
                    raise RuntimeError(
                        f"Failed to update tokens for user {user_id}: "
                        f"{patch_response.status_code} {patch_response.text}"
                    )

            logger.info("Successfully refreshed tokens for user %s", user_id)

        except Exception as exc:
            # Increment consecutive_refresh_failures in DB
            new_failures = record.consecutive_refresh_failures + 1
            logger.warning(
                "Token refresh failed for user %s (attempt %d): %s",
                user_id,
                new_failures,
                type(exc).__name__,
            )

            async with httpx.AsyncClient() as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/saxo_tokens",
                    json={"consecutive_refresh_failures": new_failures, "updated_at": now.isoformat()},
                    params={"user_id": f"eq.{user_id}"},
                    headers=self._supabase_headers,
                )

            if new_failures >= SAXO_CIRCUIT_BREAKER_LIMIT:
                raise SaxoCircuitBreakerOpenError(user_id) from exc

            raise

    async def revoke_and_delete(self, user_id: str) -> None:
        """Revoke the Saxo refresh token (best-effort) and delete the token record from Supabase."""
        record = await self.get_token_record(user_id)

        if record:
            try:
                plaintext_refresh = self._decrypt(record.refresh_token)
                revoke_url = SAXO_TOKEN_URL + "/revoke"

                async with httpx.AsyncClient() as client:
                    await client.post(
                        revoke_url,
                        data={
                            "token": plaintext_refresh,
                            "client_id": SAXO_APP_KEY,
                            "client_secret": SAXO_APP_SECRET,
                        },
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                    )

                logger.info("Revoked Saxo refresh token for user %s", user_id)

            except Exception as exc:
                # Best-effort: log and continue with deletion
                logger.warning(
                    "Failed to revoke Saxo token for user %s (continuing with deletion): %s",
                    user_id,
                    type(exc).__name__,
                )

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{SUPABASE_URL}/rest/v1/saxo_tokens",
                params={"user_id": f"eq.{user_id}"},
                headers=self._supabase_headers,
            )
            if not response.is_success:
                raise RuntimeError(
                    f"Failed to delete token record for user {user_id}: "
                    f"{response.status_code} {response.text}"
                )

        # Clean up per-user lock from memory
        self._refresh_locks.pop(user_id, None)

        logger.info("Deleted Saxo token record for user %s", user_id)
