import time
import threading
from typing import Any, Optional


class StockCache:
    """Thread-safe in-memory cache with TTL support for stock data."""

    def __init__(self):
        self._cache: dict[str, dict[str, tuple[Any, float]]] = {}
        self._lock = threading.RLock()

    def _make_key(self, symbol: str, data_type: str) -> tuple[str, str]:
        return (symbol.upper(), data_type)

    def get(self, symbol: str, data_type: str) -> Optional[Any]:
        """
        Get cached data for a symbol and data type.
        Returns None if not cached or expired.
        """
        key = self._make_key(symbol, data_type)
        with self._lock:
            if key[0] not in self._cache:
                return None
            if key[1] not in self._cache[key[0]]:
                return None

            data, expires_at = self._cache[key[0]][key[1]]
            if time.time() > expires_at:
                # Expired - remove and return None
                del self._cache[key[0]][key[1]]
                return None

            return data

    def set(self, symbol: str, data_type: str, data: Any, ttl_seconds: int) -> None:
        """
        Cache data for a symbol with a TTL.
        """
        key = self._make_key(symbol, data_type)
        expires_at = time.time() + ttl_seconds

        with self._lock:
            if key[0] not in self._cache:
                self._cache[key[0]] = {}
            self._cache[key[0]][key[1]] = (data, expires_at)

    def invalidate(self, symbol: str, data_type: Optional[str] = None) -> None:
        """
        Invalidate cache for a symbol.
        If data_type is None, invalidate all data for the symbol.
        """
        key = self._make_key(symbol, data_type or "")
        with self._lock:
            if key[0] in self._cache:
                if data_type:
                    self._cache[key[0]].pop(key[1], None)
                else:
                    del self._cache[key[0]]

    def clear(self) -> None:
        """Clear all cached data."""
        with self._lock:
            self._cache.clear()

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries from cache.
        Returns the number of entries removed.
        """
        removed = 0
        current_time = time.time()

        with self._lock:
            symbols_to_remove = []
            for symbol, data_dict in self._cache.items():
                keys_to_remove = []
                for data_type, (_, expires_at) in data_dict.items():
                    if current_time > expires_at:
                        keys_to_remove.append(data_type)
                        removed += 1

                for key in keys_to_remove:
                    del data_dict[key]

                if not data_dict:
                    symbols_to_remove.append(symbol)

            for symbol in symbols_to_remove:
                del self._cache[symbol]

        return removed

    def stats(self) -> dict:
        """Return cache statistics."""
        with self._lock:
            total_entries = sum(len(v) for v in self._cache.values())
            return {
                "symbols_cached": len(self._cache),
                "total_entries": total_entries,
            }
