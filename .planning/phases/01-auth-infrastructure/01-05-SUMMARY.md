---
phase: 1
plan: 05
subsystem: saxo-auth-router
tags: [fastapi, oauth, router, httpx, lifespan]
key_files_created:
  - backend/routers/saxo.py
  - backend/models/saxo.py
  - backend/services/saxo_exceptions.py
  - backend/services/saxo_token_service.py
  - backend/services/saxo_client.py
key_files_modified:
  - backend/config.py
  - backend/main.py
key_decisions:
  - Brought Wave 1/2 dependency files from sibling worktrees (agent-aab8b10a, agent-a34d291a) since they were not yet present in this worktree
  - token_service = SaxoTokenService() instantiated at module-level in saxo.py (matches plan spec)
  - Callback endpoint uses CSRF state for user identity; all other endpoints require Supabase JWT
requirements_completed: [AUTH-01, AUTH-02, AUTH-05]
---

Creates the Saxo OAuth router with four endpoints (connect, callback, disconnect, status) and wires it into main.py with a lifespan httpx.AsyncClient, completing the backend OAuth flow for Phase 1.

## Stats

- **Duration:** ~140 seconds
- **Tasks:** 2/2
- **Files created:** 5 (saxo.py router + 4 Wave 1/2 deps)
- **Files modified:** 2 (config.py, main.py)

## Commits

- `7b3a4c9` — feat(01-05): create Saxo auth router with 4 OAuth endpoints
- `59b0214` — feat(01-05): wire Saxo router and httpx lifespan into main.py

## Deviations

The Wave 1 and Wave 2 dependency files (models/saxo.py, services/saxo_exceptions.py, services/saxo_token_service.py, services/saxo_client.py) were absent from this worktree because plans 01-01 through 01-04 were executed in separate agent worktrees. These were copied from the sibling worktrees (agent-aab8b10a for Wave 1/2, agent-a34d291a for Wave 3 saxo_client.py) before creating the router. The Saxo environment variable constants were also missing from config.py and were added as a prerequisite. All deviations fall under Rule 3 (Blocking) — auto-fixed to enable plan completion.

## Self-Check

- [x] `backend/routers/saxo.py` exists
- [x] `router = APIRouter(prefix="/api/saxo", tags=["saxo"])` present
- [x] `async def connect_saxo(` present
- [x] `async def saxo_callback(` present
- [x] `async def disconnect_saxo(` present
- [x] `async def saxo_status(` present
- [x] `async def _get_user_id(request: Request) -> str:` present
- [x] `request.app.state.saxo_http_client` present
- [x] `"response_type": "code"` present
- [x] `RedirectResponse(url=SAXO_FRONTEND_REDIRECT_URL,` present
- [x] `token_service = SaxoTokenService()` present
- [x] `SaxoAuthURL` response model present
- [x] `SaxoConnectionStatus` response model present
- [x] `SaxoDisconnectResponse` response model present
- [x] `backend/main.py` contains `from routers import saxo as saxo_router`
- [x] `backend/main.py` contains `from contextlib import asynccontextmanager`
- [x] `backend/main.py` contains `import httpx`
- [x] `backend/main.py` contains `async def lifespan(app: FastAPI):`
- [x] `backend/main.py` contains `app.state.saxo_http_client = httpx.AsyncClient(`
- [x] `backend/main.py` contains `await app.state.saxo_http_client.aclose()`
- [x] `backend/main.py` contains `lifespan=lifespan` in FastAPI constructor
- [x] `backend/main.py` contains `app.include_router(saxo_router.router)`
- [x] Git log shows both commits: 7b3a4c9, 59b0214

## Self-Check: PASSED
