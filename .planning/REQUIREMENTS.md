# Requirements: Saxo OpenAPI Integration

**Defined:** 2026-03-28
**Core Value:** User can view their real Saxo Bank portfolio alongside existing technical analysis signals

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### OAuth & Authentication

- [ ] **AUTH-01**: User can initiate Saxo OAuth connection from settings page
- [ ] **AUTH-02**: Backend handles full OAuth 2.0 authorization code flow with Saxo SIM/Live
- [ ] **AUTH-03**: Saxo tokens are encrypted at rest in Supabase (Fernet encryption)
- [ ] **AUTH-04**: Backend refreshes Saxo access tokens proactively before expiry (20-min TTL)
- [ ] **AUTH-05**: User can disconnect their Saxo account (tokens revoked and deleted)
- [ ] **AUTH-06**: CSRF state validation prevents OAuth replay attacks

### Account & Portfolio Data

- [ ] **PORT-01**: Backend fetches Saxo client info and account list via bootstrap sequence
- [ ] **PORT-02**: User can view their Saxo portfolio positions (stocks and ETFs)
- [ ] **PORT-03**: User can view their Saxo account balance and cash available
- [ ] **PORT-04**: User can view account performance metrics from Saxo
- [ ] **PORT-05**: Saxo positions display current market price and P&L

### Instrument Mapping

- [ ] **INST-01**: Backend resolves Saxo Uic identifiers to Yahoo Finance tickers via exchange-suffix mapping
- [x] **INST-02**: Resolved mappings are persisted in Supabase for reuse
- [ ] **INST-03**: Unresolved instruments display Saxo data with a visual indicator (no TA signals)

### Frontend Integration

- [ ] **UI-01**: Portfolio page has "Saxo Positions" tab alongside existing "Manual Positions"
- [ ] **UI-02**: Settings page has "Brokerage Connections" section with connect/disconnect button
- [ ] **UI-03**: Saxo connection status badge visible when connected
- [ ] **UI-04**: Saxo positions show existing TA signals for mapped instruments
- [ ] **UI-05**: Frontend polls backend for Saxo data at 60-second intervals

### Infrastructure

- [x] **INFRA-01**: Supabase tables created: `saxo_tokens`, `saxo_oauth_state`, `saxo_instrument_map`
- [x] **INFRA-02**: Environment variables configured: `SAXO_APP_KEY`, `SAXO_APP_SECRET`, `SAXO_REDIRECT_URI`, `SAXO_ENVIRONMENT`, `SAXO_TOKEN_ENCRYPTION_KEY`
- [x] **INFRA-03**: Separate Saxo cache layer with appropriate TTLs (60s positions, 15s quotes, 24h metadata)
- [ ] **INFRA-04**: Rate limiting respected: 120 req/min/session, exponential backoff on 429s
- [ ] **INFRA-05**: Saxo API error responses normalized to typed application exceptions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Real-Time Streaming

- **STREAM-01**: WebSocket connection for real-time price streaming via `infoprices/subscriptions`
- **STREAM-02**: ENS event notifications for external position changes
- **STREAM-03**: Auto-reconnect with exponential backoff on WebSocket disconnect

### Enhanced Features

- **ENH-01**: Watchlist sync — surface Saxo positions in existing watchlist view
- **ENH-02**: Multi-account selector for users with multiple Saxo sub-accounts
- **ENH-03**: Saxo historical chart data as alternative to Yahoo Finance

## Out of Scope

| Feature | Reason |
|---------|--------|
| Trade execution via Saxo API | Financial risk from bugs; regulatory complexity; out of scope per project definition |
| Options, futures, CFDs, FX derivatives | Signal engine is equity/ETF only; each derivative type requires domain-specific logic |
| Commercial distribution | Requires Saxo written permission; personal use only |
| Automated/algorithmic trading | Financial loss risk; rate-limited to 1 order/second; out of scope |
| High-frequency polling (<10s) | 120 req/min limit makes it unsustainable; use streaming in v2 |
| Multi-broker support | Focus on Saxo only; add other brokers later if needed |
| Client/account administration | White-label partner feature; unnecessary for personal use |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| PORT-01 | Phase 2 | Pending |
| PORT-02 | Phase 2 | Pending |
| PORT-03 | Phase 2 | Pending |
| PORT-04 | Phase 2 | Pending |
| PORT-05 | Phase 2 | Pending |
| INST-01 | Phase 2 | Pending |
| INST-02 | Phase 2 | Complete |
| INST-03 | Phase 2 | Pending |
| INFRA-03 | Phase 2 | Complete |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after initial definition*
