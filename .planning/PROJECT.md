# Saxo OpenAPI Integration

## What This Is

A feature extension to the existing Technical Analysis Stock Investment Platform that integrates Saxo Bank's OpenAPI to bring real brokerage account data (portfolio positions, balances, real-time prices) into the web app. This enables users to see their actual Saxo trading positions alongside the platform's technical analysis signals and recommendations — all in one place, for personal use.

## Core Value

The user can view their real Saxo Bank portfolio and market data within the existing technical analysis platform, bridging the gap between analysis and their actual holdings.

## Requirements

### Validated

- ✓ Technical analysis with 10+ evidence-based indicators — existing
- ✓ Buy/sell signal generation with weighted scoring — existing
- ✓ Stock search across global exchanges — existing
- ✓ Interactive candlestick charts with indicator overlays — existing
- ✓ Portfolio tracking (manual positions) — existing
- ✓ Watchlist with notification preferences — existing
- ✓ User authentication via Supabase — existing
- ✓ Signal history and change detection — existing
- ✓ Stock recommendations with ranking — existing
- ✓ Email and in-app notifications — existing

### Active

- [x] Saxo OpenAPI OAuth 2.0 authentication flow — Validated in Phase 1: auth-infrastructure
- [x] Fetch and display real Saxo portfolio positions — Validated in Phase 2: portfolio-data
- [x] Fetch real-time market data from Saxo for held instruments — Validated in Phase 2: portfolio-data
- [x] Merge Saxo positions with existing manual portfolio view — Validated in Phase 3: frontend-integration
- [x] Display Saxo account balance and performance metrics — Validated in Phase 2: portfolio-data
- [x] Apply existing technical analysis signals to Saxo-held instruments — Validated in Phase 3: frontend-integration
- [ ] Sync watchlist with Saxo instruments

### Out of Scope

- Trade execution via Saxo API — adds significant complexity and regulatory risk for v1
- Commercial distribution — Saxo terms require written permission for commercial use
- Multi-broker support — focus on Saxo only for now
- Real-time streaming via WebSocket — start with polling/on-demand, add streaming later
- Saxo SIM/demo account management — user manages their own developer account

## Context

- This is a **brownfield** project adding to an existing Next.js + FastAPI + Supabase platform
- User has a Saxo Bank trading account and has created a Saxo Developer account at developer.saxo
- Saxo OpenAPI is REST-based with OAuth 2.0 authentication (SAML2/OAuth2)
- Personal use is confirmed legal per Saxo's terms of use
- The existing app already uses Yahoo Finance for market data — Saxo supplements this with real account data
- The platform runs locally via Docker Compose (frontend:3000, backend:8000)
- SIM (simulation) environment available for development and testing before connecting live account

## Constraints

- **Auth**: Saxo OAuth 2.0 requires registered redirect URI and app key from developer portal
- **Rate limits**: Saxo API has rate limits; must implement respectful polling intervals
- **Data alignment**: Saxo instrument identifiers (Uic) differ from Yahoo Finance tickers — need mapping
- **Personal use only**: Cannot redistribute or commercialize without Saxo's permission
- **Existing stack**: Must integrate within Next.js + FastAPI architecture, not introduce new frameworks
- **Token management**: Saxo access tokens expire; need refresh token flow in backend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Backend handles Saxo API calls | Keep secrets server-side, centralize token refresh | Implemented Phase 1 |
| Start with SIM environment | Safe testing without real money, identical API | Implemented Phase 1 |
| Replace Yahoo Finance with Saxo as primary data source | User wants single data source from their actual broker; Yahoo Finance to be removed | — Pending |
| OAuth flow via backend redirect | Secure token exchange, refresh tokens stored server-side | Implemented Phase 1 |
| Instrument mapping via exchange-suffix dict | 20 Saxo exchanges mapped to Yahoo Finance suffixes; unknown exchanges degrade gracefully | Implemented Phase 2 |
| SaxoPortfolioService per-request SaxoClient | Shared httpx.AsyncClient, per-request SaxoClient construction | Implemented Phase 2 |
| Polling over WebSocket initially | Simpler implementation, add streaming as v2 enhancement | Implemented Phase 3 (60s polling) |
| Fernet encryption for token storage | Standard symmetric encryption, key in env var | Implemented Phase 1 |
| Circuit breaker after 2 refresh failures | Prevents hammering Saxo API with invalid tokens | Implemented Phase 1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

Last updated: 2026-04-05 — Phase 3 (frontend-integration) complete

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after Phase 1 completion — auth infrastructure built, pending human verification with Saxo SIM credentials*
