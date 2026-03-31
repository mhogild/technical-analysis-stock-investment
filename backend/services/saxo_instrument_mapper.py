"""Saxo Uic to Yahoo Finance ticker resolution with caching and persistence."""
import logging
from typing import Optional, Tuple

import httpx

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from cache.saxo_cache import SaxoCache
from models.saxo import SaxoInstrumentMapping
from services.saxo_client import SaxoClient
from services.saxo_exceptions import SaxoAPIError, SaxoAuthError, SaxoRateLimitError

logger = logging.getLogger(__name__)

# Exchange suffix map: Saxo ExchangeId -> Yahoo Finance ticker suffix
# US exchanges have no suffix; international exchanges use standard Yahoo suffixes
SAXO_EXCHANGE_TO_YAHOO_SUFFIX = {
    "XNYS": "",      # NYSE
    "XNAS": "",      # NASDAQ
    "XASE": "",      # NYSE American (AMEX)
    "XCSE": ".CO",   # Copenhagen Stock Exchange
    "XOSL": ".OL",   # Oslo Stock Exchange
    "XSTO": ".ST",   # Stockholm Stock Exchange
    "XHEL": ".HE",   # Helsinki Stock Exchange
    "XPAR": ".PA",   # Euronext Paris
    "XFRA": ".F",    # Frankfurt Stock Exchange
    "XLON": ".L",    # London Stock Exchange
    "XAMS": ".AS",   # Euronext Amsterdam
    "XBRU": ".BR",   # Euronext Brussels
    "XLIS": ".LS",   # Euronext Lisbon
    "XMIL": ".MI",   # Borsa Italiana (Milan)
    "XMAD": ".MC",   # Bolsa de Madrid
    "XSWX": ".SW",   # SIX Swiss Exchange
    "XTSE": ".TO",   # Toronto Stock Exchange
    "XASX": ".AX",   # Australian Securities Exchange
    "XTKS": ".T",    # Tokyo Stock Exchange
    "XHKG": ".HK",   # Hong Kong Stock Exchange
}


class SaxoInstrumentMapper:
    """Resolves Saxo instrument Uic identifiers to Yahoo Finance tickers.

    Resolution flow:
    1. Check in-memory SaxoCache for (uic)
    2. Query Supabase saxo_instrument_map table
    3. Call Saxo /ref/v1/instruments/details API for Symbol + ExchangeId
    4. Apply exchange suffix map to construct yahoo_ticker
    5. Persist mapping to Supabase
    6. Cache result (24h TTL)
    """

    def __init__(self, cache: SaxoCache):
        self._cache = cache
        self._supabase_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def resolve_instruments(
        self,
        uics_and_types: list[Tuple[int, str]],
        access_token: str,
        saxo_client: SaxoClient,
    ) -> dict[int, SaxoInstrumentMapping]:
        """Batch resolution of Saxo Uic identifiers to Yahoo Finance tickers.

        Args:
            uics_and_types: List of (uic, asset_type) tuples to resolve.
            access_token: Valid Saxo access token (plaintext).
            saxo_client: SaxoClient instance for API calls.

        Returns:
            Dict keyed by uic with SaxoInstrumentMapping values.
        """
        result: dict[int, SaxoInstrumentMapping] = {}

        # Step 1: Check in-memory cache
        unresolved_uics: list[int] = []
        uic_to_type: dict[int, str] = {}
        for uic, asset_type in uics_and_types:
            uic_to_type[uic] = asset_type
            cached = self._cache.get_instrument(uic)
            if cached is not None:
                result[uic] = SaxoInstrumentMapping(**cached)
            else:
                unresolved_uics.append(uic)

        if not unresolved_uics:
            return result

        # Step 2: Query Supabase for existing mappings
        db_mappings = await self._query_supabase(unresolved_uics)
        for mapping in db_mappings:
            result[mapping.uic] = mapping
            self._cache.set_instrument(mapping.uic, mapping.model_dump())
            unresolved_uics = [u for u in unresolved_uics if u != mapping.uic]

        if not unresolved_uics:
            return result

        # Step 3: Call Saxo /ref/v1/instruments/details for remaining uics
        asset_types = list(set(uic_to_type[u] for u in unresolved_uics))
        new_mappings: dict[int, SaxoInstrumentMapping] = {}

        try:
            response = await saxo_client.get(
                access_token,
                "/ref/v1/instruments/details",
                params={
                    "Uics": ",".join(str(u) for u in unresolved_uics),
                    "AssetTypes": ",".join(asset_types),
                    "FieldGroups": "SummaryType,TradableOn",
                },
            )

            data_array = response.get("Data", [])
            returned_uics: set[int] = set()

            for instrument in data_array:
                uic = instrument.get("Uic")
                if uic is None:
                    continue

                returned_uics.add(uic)
                symbol = instrument.get("Symbol", "UNKNOWN")
                asset_type = instrument.get("AssetType", uic_to_type.get(uic, "Stock"))

                # ExchangeId may be top-level or in TradableOn[0]
                exchange_id: Optional[str] = instrument.get("ExchangeId")
                if exchange_id is None:
                    tradable_on = instrument.get("TradableOn", [])
                    if tradable_on:
                        exchange_id = tradable_on[0].get("ExchangeId")

                # Step 4: Apply exchange suffix map
                if exchange_id is not None and exchange_id in SAXO_EXCHANGE_TO_YAHOO_SUFFIX:
                    suffix = SAXO_EXCHANGE_TO_YAHOO_SUFFIX[exchange_id]
                    yahoo_ticker = f"{symbol}{suffix}"
                    mapped = True
                else:
                    if exchange_id is not None:
                        logger.warning(
                            "Unknown Saxo ExchangeId '%s' for uic %d (%s) — marking unmapped",
                            exchange_id,
                            uic,
                            symbol,
                        )
                    yahoo_ticker = None
                    mapped = False

                mapping = SaxoInstrumentMapping(
                    uic=uic,
                    asset_type=asset_type,
                    saxo_symbol=symbol,
                    saxo_exchange=exchange_id,
                    yahoo_ticker=yahoo_ticker,
                    mapped=mapped,
                )
                new_mappings[uic] = mapping

            # Step 7: Handle uics that Saxo didn't return data for
            for uic in unresolved_uics:
                if uic not in returned_uics:
                    logger.warning(
                        "Saxo returned no data for uic %d — marking unmapped",
                        uic,
                    )
                    mapping = SaxoInstrumentMapping(
                        uic=uic,
                        asset_type=uic_to_type.get(uic, "Stock"),
                        saxo_symbol="UNKNOWN",
                        saxo_exchange=None,
                        yahoo_ticker=None,
                        mapped=False,
                    )
                    new_mappings[uic] = mapping

        except (SaxoAPIError, SaxoAuthError, SaxoRateLimitError) as exc:
            logger.error(
                "Saxo instruments/details call failed (%s) — marking %d uics as unmapped",
                type(exc).__name__,
                len(unresolved_uics),
            )
            for uic in unresolved_uics:
                new_mappings[uic] = SaxoInstrumentMapping(
                    uic=uic,
                    asset_type=uic_to_type.get(uic, "Stock"),
                    saxo_symbol="UNKNOWN",
                    saxo_exchange=None,
                    yahoo_ticker=None,
                    mapped=False,
                )

        # Steps 5 & 6: Persist and cache new mappings
        for uic, mapping in new_mappings.items():
            await self._persist_mapping(mapping)
            self._cache.set_instrument(uic, mapping.model_dump())
            result[uic] = mapping

        return result

    async def _query_supabase(self, uics: list[int]) -> list[SaxoInstrumentMapping]:
        """Query Supabase for existing instrument mappings."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/saxo_instrument_map",
                    params={"uic": f"in.({','.join(str(u) for u in uics)})"},
                    headers=self._supabase_headers,
                )
                if not response.is_success:
                    logger.warning("Failed to query instrument map: %s", response.text)
                    return []
                return [SaxoInstrumentMapping(**row) for row in response.json()]
        except Exception as exc:
            logger.warning("Supabase instrument map query failed: %s", type(exc).__name__)
            return []

    async def _persist_mapping(self, mapping: SaxoInstrumentMapping) -> None:
        """Upsert a single mapping to Supabase saxo_instrument_map."""
        upsert_headers = {
            **self._supabase_headers,
            "Prefer": "resolution=merge-duplicates,return=representation",
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{SUPABASE_URL}/rest/v1/saxo_instrument_map",
                    json=mapping.model_dump(),
                    headers=upsert_headers,
                )
                if not response.is_success:
                    logger.warning(
                        "Failed to persist instrument mapping for uic %d: %s",
                        mapping.uic,
                        response.text,
                    )
        except Exception as exc:
            logger.warning(
                "Supabase persist for uic %d failed: %s",
                mapping.uic,
                type(exc).__name__,
            )
