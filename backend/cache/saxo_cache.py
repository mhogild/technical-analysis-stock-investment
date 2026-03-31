import time
import threading
from typing import Any, Optional
from config import CACHE_TTL_SAXO_POSITIONS, CACHE_TTL_SAXO_INSTRUMENTS


class SaxoCache:
    """Thread-safe in-memory TTL cache for Saxo API responses."""

    def __init__(self):
        self._cache: dict[str, dict[str, tuple[Any, float]]] = {}
        self._lock = threading.RLock()

    def _get(self, primary_key: str, data_type: str) -> Optional[Any]:
        """Get cached data. Returns None if not cached or expired."""
        with self._lock:
            if primary_key not in self._cache:
                return None
            if data_type not in self._cache[primary_key]:
                return None

            data, expires_at = self._cache[primary_key][data_type]
            if time.time() > expires_at:
                # Expired - remove and return None
                del self._cache[primary_key][data_type]
                return None

            return data

    def _set(self, primary_key: str, data_type: str, data: Any, ttl_seconds: int) -> None:
        """Cache data with TTL."""
        expires_at = time.time() + ttl_seconds

        with self._lock:
            if primary_key not in self._cache:
                self._cache[primary_key] = {}
            self._cache[primary_key][data_type] = (data, expires_at)

    # User-scoped data (keyed by user_id)
    def get_positions(self, user_id: str) -> Optional[Any]: return self._get(user_id, "positions")
    def set_positions(self, user_id: str, data: Any, ttl: int = CACHE_TTL_SAXO_POSITIONS) -> None: self._set(user_id, "positions", data, ttl)
    def get_balance(self, user_id: str) -> Optional[Any]: return self._get(user_id, "balance")
    def set_balance(self, user_id: str, data: Any, ttl: int = CACHE_TTL_SAXO_POSITIONS) -> None: self._set(user_id, "balance", data, ttl)
    def get_performance(self, user_id: str) -> Optional[Any]: return self._get(user_id, "performance")
    def set_performance(self, user_id: str, data: Any, ttl: int = CACHE_TTL_SAXO_POSITIONS) -> None: self._set(user_id, "performance", data, ttl)
    def get_client_info(self, user_id: str) -> Optional[Any]: return self._get(user_id, "client_info")
    def set_client_info(self, user_id: str, data: Any, ttl: int = CACHE_TTL_SAXO_INSTRUMENTS) -> None: self._set(user_id, "client_info", data, ttl)

    # Instrument data (keyed by str(uic))
    def get_instrument(self, uic: int) -> Optional[Any]: return self._get(str(uic), "instrument")
    def set_instrument(self, uic: int, data: Any, ttl: int = CACHE_TTL_SAXO_INSTRUMENTS) -> None: self._set(str(uic), "instrument", data, ttl)

    def invalidate_user(self, user_id: str) -> None:
        """Remove all cached data for a user."""
        with self._lock:
            if user_id in self._cache:
                del self._cache[user_id]

    def clear(self) -> None:
        """Clear all cached data."""
        with self._lock:
            self._cache.clear()

    def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count removed."""
        removed = 0
        current_time = time.time()

        with self._lock:
            keys_to_remove = []
            for primary_key, data_dict in self._cache.items():
                types_to_remove = []
                for data_type, (_, expires_at) in data_dict.items():
                    if current_time > expires_at:
                        types_to_remove.append(data_type)
                        removed += 1

                for data_type in types_to_remove:
                    del data_dict[data_type]

                if not data_dict:
                    keys_to_remove.append(primary_key)

            for primary_key in keys_to_remove:
                del self._cache[primary_key]

        return removed

    def stats(self) -> dict:
        """Return cache statistics."""
        with self._lock:
            total_entries = sum(len(v) for v in self._cache.values())
            return {
                "keys_cached": len(self._cache),
                "total_entries": total_entries,
            }
