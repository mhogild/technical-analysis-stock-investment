from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import stock as stock_router
from routers import search as search_router
from routers import exchanges as exchanges_router
from routers import portfolio as portfolio_router
from routers import recommendations as recommendations_router
from routers import industries as industries_router
from routers import saxo as saxo_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create shared httpx client for Saxo API calls
    app.state.saxo_http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=5.0),
        headers={"Accept": "application/json"},
    )
    yield
    # Shutdown: close the shared client
    await app.state.saxo_http_client.aclose()


app = FastAPI(title="StockSignal API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(stock_router.router)
app.include_router(search_router.router)
app.include_router(exchanges_router.router)
app.include_router(portfolio_router.router)
app.include_router(recommendations_router.router)
app.include_router(industries_router.router)
app.include_router(saxo_router.router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "StockSignal API"}
