---
phase: 1
plan: 01
subsystem: database-and-config
tags: [migrations, supabase, config, environment, dependencies]
key_files_created:
  - supabase/migrations/008_create_saxo_tokens.sql
  - supabase/migrations/009_create_saxo_oauth_state.sql
key_files_modified:
  - backend/config.py
  - .env.example
  - backend/requirements.txt
key_decisions:
  - saxo_tokens uses UNIQUE on user_id (one Saxo connection per user), circuit breaker counter survives restarts
  - saxo_oauth_state uses state value as PK with index on expires_at for efficient CSRF cleanup
  - SAXO_BASE_URL/AUTH_URL/TOKEN_URL derived at config load time from SAXO_ENVIRONMENT to avoid runtime branching
  - No saxo_openapi PyPI package — unmaintained and synchronous; authlib used instead
requirements_completed: [INFRA-01, INFRA-02]
---

Created Supabase database migrations for Saxo token storage (encrypted-at-rest columns, circuit breaker counter, RLS) and OAuth CSRF state management (expires_at index, backend-only access), plus all Saxo env vars and derived URL constants in config.py/.env.example, and three new Python deps (authlib, cryptography, tenacity).

## Duration

~65 seconds

## Task Count

5/5 completed

## File Count

5 files (2 created, 3 modified)

## Commits

| Hash | Message |
|------|---------|
| 61762ca | feat(01-01): add saxo_tokens migration with RLS and circuit breaker column |
| 25904b8 | feat(01-01): add saxo_oauth_state migration with expires_at index and RLS |
| 88d9e1b | feat(01-01): add Saxo env vars and derived URL constants to backend config |
| 752d1aa | chore(01-01): add Saxo OpenAPI env var templates to .env.example |
| 07d33be | chore(01-01): add authlib, cryptography, tenacity to Python dependencies |

## Deviations

None - plan executed exactly as written

## Self-Check

- [x] `supabase/migrations/008_create_saxo_tokens.sql` exists with `CREATE TABLE IF NOT EXISTS saxo_tokens`, `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`, `consecutive_refresh_failures INTEGER NOT NULL DEFAULT 0`, `ALTER TABLE saxo_tokens ENABLE ROW LEVEL SECURITY`
- [x] `supabase/migrations/009_create_saxo_oauth_state.sql` exists with `state TEXT PRIMARY KEY`, `idx_saxo_oauth_state_expires_at` index, RLS enabled
- [x] `backend/config.py` contains `SAXO_APP_KEY`, `SAXO_APP_SECRET`, `SAXO_REDIRECT_URI`, `SAXO_ENVIRONMENT`, `SAXO_TOKEN_ENCRYPTION_KEY`, `SAXO_FRONTEND_REDIRECT_URL`, `SAXO_BASE_URL`, `SAXO_AUTH_URL`, `SAXO_TOKEN_URL`, `SAXO_REFRESH_BUFFER_SECONDS = 300`, `SAXO_CIRCUIT_BREAKER_LIMIT = 2`
- [x] `.env.example` contains all 6 Saxo template vars
- [x] `backend/requirements.txt` contains `authlib>=1.3.0`, `cryptography>=42.0.0`, `tenacity>=8.2.0`, does NOT contain `saxo_openapi`
- [x] All 5 commits present in git log

## Self-Check: PASSED
