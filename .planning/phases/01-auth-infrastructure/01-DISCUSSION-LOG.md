# Phase 1: Auth & Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 01-auth-infrastructure
**Areas discussed:** Data source strategy, OAuth flow, Token security, Environment config, API client design

---

## Data Source Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Replace Yahoo Finance with Saxo | Single data source from actual broker | ✓ |
| Supplement Yahoo Finance | Keep Yahoo for non-Saxo instruments | |
| Hybrid with fallback | Saxo primary, Yahoo fallback | |

**User's choice:** Replace Yahoo Finance with Saxo
**Notes:** User explicitly requested "yahoo-finance is switched with saxo". This is a fundamental architectural change from the original PROJECT.md assumption of supplementing.

---

## OAuth Flow Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Backend-only (FastAPI callback) | Secure, tokens never reach browser | ✓ |
| Frontend callback with backend exchange | Simpler routing but token exposure risk | |

**User's choice:** Backend-only (auto-selected based on research recommendation)
**Notes:** Research unanimously recommended backend-only flow. Saxo docs explicitly warn against frontend token handling.

---

## Token Security

| Option | Description | Selected |
|--------|-------------|----------|
| Fernet encryption in Supabase | Application-layer encryption, existing infrastructure | ✓ |
| Redis with encryption | Fast but adds new infrastructure | |
| Backend memory only | Lost on restart, no persistence | |

**User's choice:** Fernet in Supabase (auto-selected based on research recommendation)
**Notes:** No new infrastructure needed. Supabase already in use. Docker restarts would lose in-memory tokens.

---

## Claude's Discretion

- Error response format and exception hierarchy
- Exact Supabase table column definitions
- Logging strategy for debugging

## Deferred Ideas

- Yahoo Finance code removal — after Phase 3 validation
- WebSocket streaming — v2
- Multi-account UI — v2
