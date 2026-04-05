# Phase 4: Data Source Decision — Research

**Compiled:** 2026-04-05
**Phase:** 04-data-source-decision
**Status:** Ready for planning

---

## 1. What DATA-01 and DATA-02 Require

From `.planning/REQUIREMENTS.md`:

| Requirement | Text |
|-------------|------|
| **DATA-01** | User can see a documented comparison of Saxo API vs Yahoo Finance capabilities for discovery features (sector data, volume, screener, rate limits) |
| **DATA-02** | System confirms which data source is used for each feature and closes the pending "replace Yahoo Finance" decision |

Both are listed in the Traceability table under Phase 4 with status Pending.

**What "done" looks like for each:**

- DATA-01 is satisfied by the existence of a written capability comparison table that covers sector data, volume/most-active, screener, and rate limits for both Saxo and yfinance. The user (or any future developer) can read it without doing their own research.
- DATA-02 is satisfied when the pending Key Decisions row in `PROJECT.md` is updated from `— Pending` to a closed, rationale-backed outcome, and when every v1.1 feature area is unambiguously assigned to one data source.

The Out of Scope section in `REQUIREMENTS.md` already contains the verdict as a passive note: "Replace Yahoo Finance with Saxo for discovery — Research confirmed Saxo lacks screener, sector aggregates, and most-active endpoints." Phase 4 formally promotes that note into the authoritative decision record.

---

## 2. Current State of the Data Source Question

### What is already decided (informally)

The v1.1 research phase (`research/SUMMARY.md`, `research/STACK.md`) reached a clear verdict:

> Use yfinance for all discovery and market trends features. Use Saxo exclusively for portfolio data.

That conclusion is documented in three research files and referenced in `STATE.md`:

- `research/SUMMARY.md` §5 "Data Source Verdict" — table and closing statement
- `research/STACK.md` §5 "Data Source Comparison: yfinance vs Saxo OpenAPI" — detailed capability tables for both sources
- `STATE.md` — "Pending decision: Saxo vs Yahoo Finance data source — NOW RESOLVED in Phase 4"

The REQUIREMENTS.md Out of Scope table includes "Replace Yahoo Finance with Saxo for discovery" as an explicit exclusion.

### What is still pending (the formal record)

The `PROJECT.md` Key Decisions table contains this row:

```
| Replace Yahoo Finance with Saxo as primary data source | User wants single data source from their actual broker; Yahoo Finance to be removed | — Pending |
```

This row has an incorrect rationale (written before research was done — the user's original preference was for Saxo) and an unresolved outcome. Phase 4 exists solely to update this row with the correct, research-backed rationale and close the decision.

### Why this is a gate phase

`STATE.md` explains: "This is a gate phase — its outcome is already determined by research. Recording it formally prevents re-litigation and unblocks all subsequent phases." Phases 5–9 each depend on knowing which data source to use. Without a written decision, any developer (or future AI agent) working on those phases could re-open the question.

---

## 3. What PROJECT.md Currently Contains and What Needs to Change

### Current state of Key Decisions table (relevant row)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace Yahoo Finance with Saxo as primary data source | User wants single data source from their actual broker; Yahoo Finance to be removed | — Pending |

Problems with this row:
1. **Rationale is the original user preference**, not the research finding. It implies the preference was validated, which it was not.
2. **Outcome is unresolved.** Any future reader sees "Pending" and may believe the question is still open.
3. **Scope is too broad.** "Primary data source" conflates discovery/market data (yfinance's domain) with portfolio/account data (Saxo's domain). These are different feature areas with different answers.

### Required change to PROJECT.md

The row must be updated to:
- Reflect the correct rationale: Saxo lacks screener, sector aggregates, and most-active endpoints; instrument coverage is account-dependent and unsuitable for broad discovery; Saxo requires paid market data subscriptions for OHLCV on most equity exchanges.
- Record the closed outcome: yfinance for all discovery and market data; Saxo for portfolio/account data only.
- Optionally: split the row into two if the planner wants to make the split explicit (one row per domain).

Additionally, the Requirements section of `PROJECT.md` under "Active" contains:
```
- [ ] Evaluate Saxo API vs Yahoo Finance as primary data source
```
This must be moved to "Validated" once DATA-01 and DATA-02 are closed.

---

## 4. Capabilities Comparison: yfinance vs Saxo by v1.1 Feature Area

This is the core substance that DATA-01 requires to be documented. It is drawn from `research/STACK.md` §5 and `research/SUMMARY.md` §5.

### Stock Screener (SCRN-01, SCRN-02, SCRN-03)

| Capability needed | yfinance | Saxo |
|-------------------|----------|------|
| Filter by sector (GICS) | Yes — `yf.EquityQuery('eq', ['sector', ...])` | No screener capability; `/ref/v1/instruments` returns reference data only, not screener results |
| Filter by market cap | Yes — `yf.EquityQuery('gt', ['intradaymarketcap', ...])` | No |
| Filter by signal (buy/sell/hold) | Not directly — signal applied post-fetch by existing SignalEngine | Not applicable |
| Broad universe (not account-specific) | Yes — global 50+ exchanges | No — instrument coverage is broker-account-dependent |
| Sector classification field | Yes — `ticker.info['sector']` (GICS-aligned) | Partial — `SectorId` filter exists but sector name not returned in summary; requires separate details call |
| Auth required | No | Yes — OAuth 2.0, 20-min access token |

**Verdict for screener:** yfinance only.

### Most-Traded Stocks (TRND-01)

| Capability needed | yfinance | Saxo |
|-------------------|----------|------|
| Market-wide volume ranking | Yes — `yf.screen('most_actives')` (US, 5M volume min) | No — no endpoint ranks instruments by trading volume |
| Dollar volume calculation | Yes — `regularMarketVolume × regularMarketPrice` from screener response | Not available |
| International most-active | Partial — US only via predefined screener; international requires per-exchange EquityQuery | No |
| Rate limits | None documented; informal scraping; can throttle | 120 req/min per session per service group (firm enforced) |

**Verdict for most-traded:** yfinance only.

### Sector Performance (TRND-02, TRND-03)

| Capability needed | yfinance | Saxo |
|-------------------|----------|------|
| Sector-level 1-day % change | Yes — `yf.Sector(key).overview['one_day_change_pct']` | No sector-level performance endpoint exists |
| Sector-level YTD % change | Yes — `yf.Sector(key).overview['ytd_change_pct']` | No |
| Sub-industry breakdown | Yes — `yf.Sector(key).industries` DataFrame | No equivalent |
| Top-performing companies by sector | Yes — `yf.Sector(key).top_companies` and `yf.Industry(key).top_performing_companies` | No |
| All 11 GICS sectors | Yes — 11 valid sector keys confirmed | No equivalent |

**Verdict for sector performance:** yfinance only.

### Most-Viewed Stocks (TRND-04, TRND-05)

This feature tracks platform-level stock page visits. Neither yfinance nor Saxo is the data source — the data lives in Supabase (`stock_view_counts` table). Both data sources are irrelevant here.

**Verdict for most-viewed:** Supabase (existing stack); no external data source required.

### Portfolio and Account Data (existing, v1.0 features)

| Capability needed | yfinance | Saxo |
|-------------------|----------|------|
| Real portfolio positions | No | Yes — `GET /openapi/port/v1/positions` |
| Account balances and NAV | No | Yes — `GET /openapi/port/v1/balances` |
| Real-time quotes for held instruments | Delayed/unofficial | Yes — `GET /trade/v1/infoprices` |
| Historical OHLCV for TA signals on held instruments | Yes — `ticker.history()` | Yes — `GET /chart/v3/charts` (but requires paid market data subscriptions for most equity exchanges) |

**Verdict for portfolio/account data:** Saxo only. yfinance is currently used for the TA signal computation on held instruments (historical OHLCV). This is acceptable for v1.1 — migrating OHLCV to Saxo chart data is a valid v1.2 investigation but requires a data parity test and normalization adapter layer. It must not be pursued in v1.1.

### Summary Table: Authoritative Data Source Per Feature

| v1.1 Feature | Authoritative Data Source | Rationale |
|---|---|---|
| Stock screener | yfinance (`yf.EquityQuery` + `yf.screen()`) | Only source with screener capability |
| Most-traded stocks | yfinance (`yf.screen('most_actives')`) | Only source with market-wide volume ranking |
| Sector performance (daily + YTD) | yfinance (`yf.Sector`) | Only source with sector-level aggregates |
| Sector drill-down (top companies) | yfinance (`yf.Industry`) | Only source with sub-industry breakdowns |
| Most-viewed stocks (ranking) | Supabase (`stock_view_counts` table) | Internal platform data; no external source |
| View tracking (increment) | Supabase (Postgres upsert function) | Internal platform data; no external source |
| Portfolio positions | Saxo OpenAPI | Already implemented in v1.0 |
| Account balances | Saxo OpenAPI | Already implemented in v1.0 |
| Real-time quotes (held instruments) | Saxo OpenAPI | Already implemented in v1.0 |
| Historical OHLCV for TA signals | yfinance (status quo) | Saxo OHLCV migration deferred to v1.2 investigation |

---

## 5. Recommended Decision Record Format for PROJECT.md

### Option A: Single updated row (simple)

Replace the existing Pending row with:

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace Yahoo Finance with Saxo as primary data source | Research (v1.1 phase) confirmed Saxo lacks screener capability, sector performance aggregates, and most-active stock endpoints. Saxo's instrument coverage is account-dependent, unsuitable for broad market discovery. Saxo also requires paid per-exchange market data subscriptions for OHLCV, which would break the existing TA signal pipeline. The current split — yfinance for market/discovery data, Saxo for portfolio/account data — is the correct long-term model. | **Closed — not pursued.** yfinance is authoritative for all discovery and market data. Saxo is authoritative for portfolio positions, balances, and real-time quotes for held instruments. A Saxo OHLCV migration (for TA signal quality improvement) may be revisited in v1.2 as a separate isolated investigation. |

### Option B: Split into two rows (explicit by domain)

Replace with two rows:

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Data source for discovery and market features (v1.1) | Saxo has no screener capability, no sector performance aggregates, and no most-active endpoint. Its instrument coverage is account-dependent. | **Closed.** yfinance is the authoritative source for screener, sector performance, and most-traded features. |
| Data source for portfolio and account data | Saxo is the only source for real positions, balances, and real-time quotes for held instruments. yfinance cannot replicate brokerage account data. | **Closed.** Saxo OpenAPI is the authoritative source for all portfolio and account data. |

**Recommendation for the planner:** Option A is simpler and closes the original pending row cleanly. Option B is more scannable for future readers quickly determining which source to use for a given feature. Given that the primary success criterion is unambiguous per-feature data source assignment, Option B marginally better serves that criterion. Either is acceptable; choose based on what fits the existing table's tone.

### ADR Best Practices Applied

This decision record does not need a full ADR document (that format is better suited to architectural choices with multiple competing options evaluated). The PROJECT.md Key Decisions table is the correct artifact — it is already the established convention for this project. The table should satisfy:

1. **Status** — clear closed/open indicator (use "Closed — not pursued" or "Closed — implemented")
2. **Context** — brief reason the decision arose (original user preference for a single data source)
3. **Decision** — the actual choice made
4. **Rationale** — the evidence that drove the choice (specific missing capabilities in Saxo)
5. **Consequences** — what this means for future work (yfinance stays; Saxo OHLCV migration is v1.2 scope at earliest)

The recommended Option A row above incorporates all five elements in the three columns of the existing table.

---

## 6. Risks and Considerations for the Planner

### Low-risk phase overall

Phase 4 is documentation-only. There is no code to write, no services to deploy, no tests to run. The risk profile is much lower than any subsequent phase.

### Risk 1: Rationale must be specific enough to prevent re-litigation

The most important thing about this decision record is that it must cite specific missing Saxo capabilities by name. A vague rationale like "Saxo doesn't support discovery" will not prevent a future developer (or AI agent) from re-opening the question. The rationale should name: screener capability, sector performance aggregates, most-active endpoint, and account-dependent instrument coverage.

### Risk 2: The "v1.2 investigation" note must be explicit

There is a legitimate future question: should Saxo's `chart/v3/charts` endpoint replace yfinance for OHLCV data used in TA signal computation for Saxo-held instruments? This is not answered in Phase 4. If the decision record does not explicitly name this as deferred-to-v1.2, there is a risk it gets raised during v1.1 feature phases and derails the work. The recommended rationale text above includes this note.

### Risk 3: The Requirements section in PROJECT.md needs a parallel update

Closing the Key Decisions row addresses DATA-02's primary success criterion. But `PROJECT.md` also has an Active requirement:
```
- [ ] Evaluate Saxo API vs Yahoo Finance as primary data source
```
This must be moved to Validated with a phase reference, or the document will be internally inconsistent. The planner should include this as a required change in the plan.

### Risk 4: REQUIREMENTS.md Out of Scope entry is already correct

The Out of Scope table in `REQUIREMENTS.md` already has the correct entry: "Replace Yahoo Finance with Saxo for discovery — Research confirmed Saxo lacks screener, sector aggregates, and most-active endpoints." No change is needed to `REQUIREMENTS.md`.

### Risk 5: No new files should be created

The plan should not create a separate ADR file or a new research document. The single authoritative change is to `PROJECT.md`. Creating additional documents would scatter the decision record and reduce the chance any future reader finds it.

---

## 7. Files the Plan Must Touch

| File | Change Required |
|------|----------------|
| `.planning/PROJECT.md` | Update the Pending Key Decision row to closed with full rationale. Move the Active requirement "Evaluate Saxo API vs Yahoo Finance" to Validated. Update "Last updated" timestamp. |

No code files. No new files. No other planning files require changes.

---

## RESEARCH COMPLETE
