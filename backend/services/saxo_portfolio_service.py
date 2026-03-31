"""Saxo portfolio data service: positions, balance, performance with caching and instrument mapping."""
import logging
from typing import Optional

from cache.saxo_cache import SaxoCache
from models.saxo import (
    SaxoPosition,
    SaxoPositionsResponse,
    SaxoBalance,
    SaxoPerformance,
    SaxoClientInfo,
)
from services.saxo_client import SaxoClient
from services.saxo_instrument_mapper import SaxoInstrumentMapper
from services.saxo_token_service import SaxoTokenService
from services.saxo_exceptions import SaxoAPIError

logger = logging.getLogger(__name__)


class SaxoPortfolioService:
    """Fetches and caches Saxo account data: positions, balance, performance.

    Dependencies are injected via constructor. SaxoClient and access_token
    are passed per-method to reuse the shared httpx.AsyncClient from app.state.
    """

    def __init__(self, token_service: SaxoTokenService, cache: SaxoCache):
        self._token_service = token_service
        self._cache = cache
        self._instrument_mapper = SaxoInstrumentMapper(cache)

    async def _ensure_bootstrap(self, user_id: str, saxo_client: SaxoClient) -> SaxoClientInfo:
        """Lazy bootstrap — fetch client info on first request, cache 24h.

        Does NOT catch exceptions — SaxoAPIError and SaxoAuthError propagate to the route handler.
        """
        cached = self._cache.get_client_info(user_id)
        if cached is not None:
            return SaxoClientInfo(**cached)

        access_token = await self._token_service.get_valid_token(user_id)
        data = await saxo_client.get(access_token, "/port/v1/clients/me")

        client_info = SaxoClientInfo(
            client_key=data["ClientKey"],
            default_account_key=data["DefaultAccountKey"],
            default_account_id=data.get("DefaultAccountId", ""),
            name=data.get("Name", ""),
            default_currency=data.get("DefaultCurrency", "DKK"),
        )

        self._cache.set_client_info(user_id, client_info.model_dump())
        return client_info

    async def get_positions(self, user_id: str, saxo_client: SaxoClient) -> SaxoPositionsResponse:
        """Fetch and cache portfolio positions with instrument mapping.

        Returns a SaxoPositionsResponse with mapped yahoo_ticker where resolvable.
        Empty portfolio returns valid response with empty list.
        """
        cached = self._cache.get_positions(user_id)
        if cached is not None:
            return SaxoPositionsResponse(**cached)

        client_info = await self._ensure_bootstrap(user_id, saxo_client)
        access_token = await self._token_service.get_valid_token(user_id)

        data = await saxo_client.get(
            access_token,
            "/port/v1/positions/me",
            params={
                "FieldGroups": "PositionBase,PositionView,DisplayAndFormat",
                "AccountKey": client_info.default_account_key,
            },
        )

        raw_positions = data.get("Data", [])
        if not raw_positions:
            response = SaxoPositionsResponse(positions=[], mapped_count=0, unmapped_count=0)
            self._cache.set_positions(user_id, response.model_dump())
            return response

        uics_and_types = [
            (p["PositionBase"]["Uic"], p["PositionBase"]["AssetType"])
            for p in raw_positions
        ]

        mappings = await self._instrument_mapper.resolve_instruments(
            uics_and_types, access_token, saxo_client
        )

        positions = []
        for p in raw_positions:
            base = p.get("PositionBase", {})
            view = p.get("PositionView", {})
            display = p.get("DisplayAndFormat", {})
            uic = base.get("Uic", 0)
            mapping = mappings.get(uic)

            positions.append(SaxoPosition(
                position_id=p.get("PositionId", ""),
                uic=uic,
                asset_type=base.get("AssetType", "Unknown"),
                saxo_symbol=display.get("Symbol", ""),
                description=display.get("Description", ""),
                amount=base.get("Amount", 0.0),
                open_price=base.get("OpenPrice", 0.0),
                current_price=view.get("CurrentPrice", 0.0),
                profit_loss=view.get("ProfitLossOnTrade", 0.0),
                profit_loss_base_currency=view.get("ProfitLossOnTradeInBaseCurrency", 0.0),
                market_value=view.get("MarketValue", 0.0),
                currency=display.get("Currency", ""),
                exposure_currency=view.get("ExposureCurrency", ""),
                value_date=base.get("ValueDate"),
                yahoo_ticker=mapping.yahoo_ticker if mapping else None,
                mapped=mapping.mapped if mapping else False,
            ))

        mapped_count = sum(1 for p in positions if p.mapped)
        unmapped_count = len(positions) - mapped_count

        response = SaxoPositionsResponse(
            positions=positions,
            mapped_count=mapped_count,
            unmapped_count=unmapped_count,
        )
        self._cache.set_positions(user_id, response.model_dump())
        return response

    async def get_balance(self, user_id: str, saxo_client: SaxoClient) -> SaxoBalance:
        """Fetch and cache account balance summary."""
        cached = self._cache.get_balance(user_id)
        if cached is not None:
            return SaxoBalance(**cached)

        client_info = await self._ensure_bootstrap(user_id, saxo_client)
        access_token = await self._token_service.get_valid_token(user_id)

        data = await saxo_client.get(
            access_token,
            "/port/v1/balances/me",
            params={
                "FieldGroups": "BalanceSummary",
                "AccountKey": client_info.default_account_key,
            },
        )

        balance = SaxoBalance(
            total_value=data.get("TotalValue", 0.0),
            cash_balance=data.get("CashBalance", 0.0),
            unrealized_positions_value=data.get("UnrealizedPositionsValue", 0.0),
            currency=data.get("Currency", "DKK"),
            margin_used=data.get("MarginUsedByCurrentPositions", 0.0),
            margin_available=data.get("MarginAvailableForTrading", 0.0),
            change_today=data.get("ChangeInValueToday", 0.0),
        )

        self._cache.set_balance(user_id, balance.model_dump())
        return balance

    async def get_performance(self, user_id: str, saxo_client: SaxoClient) -> SaxoPerformance:
        """Fetch and cache account performance metrics.

        Uses /port/v1/balances/me as data source (analytics endpoint unavailable on SIM).
        Computes change_today_percent from balance fields.
        """
        cached = self._cache.get_performance(user_id)
        if cached is not None:
            return SaxoPerformance(**cached)

        client_info = await self._ensure_bootstrap(user_id, saxo_client)
        access_token = await self._token_service.get_valid_token(user_id)

        try:
            data = await saxo_client.get(
                access_token,
                "/port/v1/balances/me",
                params={
                    "FieldGroups": "BalanceSummary",
                    "AccountKey": client_info.default_account_key,
                },
            )
        except SaxoAPIError as e:
            logger.warning("Performance fetch failed, returning cached balance data: %s", e)
            raise

        total_value = data.get("TotalValue", 0.0)
        change_today = data.get("ChangeInValueToday", 0.0)
        previous_value = total_value - change_today
        change_today_percent = (change_today / previous_value * 100) if previous_value != 0 else 0.0

        performance = SaxoPerformance(
            total_value=total_value,
            cash_balance=data.get("CashBalance", 0.0),
            unrealized_positions_value=data.get("UnrealizedPositionsValue", 0.0),
            change_today=change_today,
            change_today_percent=round(change_today_percent, 2),
            currency=data.get("Currency", "DKK"),
        )

        self._cache.set_performance(user_id, performance.model_dump())
        return performance
