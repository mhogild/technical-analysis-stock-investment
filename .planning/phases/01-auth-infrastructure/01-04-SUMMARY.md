---
phase: 1
plan: 04
subsystem: backend/services
tags: [saxo, http-client, rate-limiting, retries, error-normalization]
key_files_created:
  - backend/services/saxo_client.py
key_files_modified: []
key_decisions:
  - httpx.AsyncClient injected via constructor (shared lifespan, not created internally)
  - tenacity retry on SaxoRateLimitError, httpx.TimeoutException, and 502/503 status codes
  - Both Saxo error body shapes handled (ErrorCode/Message and error/error_description)
  - Tokens never appear in any log statement — only rate limit remaining count logged
requirements_completed: [INFRA-04, INFRA-05]
---

# Plan 01-04 Summary

Built `SaxoClient`, an `httpx.AsyncClient` wrapper that injects Bearer tokens per-request, parses X-RateLimit-Remaining and Retry-After headers, retries up to 3 times with exponential backoff + jitter on 429/502/503/timeout via tenacity, enforces a 10-second timeout on all Saxo API calls, and normalizes all non-2xx responses into typed `SaxoAuthError`, `SaxoRateLimitError`, or `SaxoAPIError` exceptions.

## Stats

- **Duration:** 88 seconds
- **Tasks completed:** 1/1
- **Files created:** 1
- **Files modified:** 0

## Deviations

None — plan executed exactly as written.

Pre-execution: Merged `main` into worktree branch to obtain Wave 1 dependencies (`saxo_exceptions.py`, updated `config.py` with `SAXO_BASE_URL`). This was a necessary prerequisite, not a plan deviation.

## Self-Check

- [x] `backend/services/saxo_client.py` exists
- [x] Contains `class SaxoClient:`
- [x] Contains `def __init__(self, http_client: httpx.AsyncClient):`
- [x] Contains `async def get(self, access_token: str, path: str`
- [x] Contains `async def post(self, access_token: str, path: str`
- [x] Contains `def _handle_response(self, response: httpx.Response)`
- [x] Contains `timeout=10.0`
- [x] Contains `@retry(`
- [x] Contains `stop_after_attempt(3)`
- [x] Contains `wait_exponential_jitter(initial=1, max=10)`
- [x] Contains `def _is_retryable(exc: Exception) -> bool:`
- [x] Contains `SaxoRateLimitError`
- [x] Contains `SaxoAuthError`
- [x] Contains `SaxoAPIError`
- [x] Contains `X-RateLimit-Remaining`
- [x] Contains `Retry-After`
- [x] Does NOT log `access_token` value
- [x] `python -c "from services.saxo_client import SaxoClient; print('import OK')"` — PASSED
- [x] Commit `2e3219b` in git log

## Self-Check: PASSED
