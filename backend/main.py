from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import stock as stock_router
from routers import search as search_router
from routers import exchanges as exchanges_router
from routers import portfolio as portfolio_router
from routers import recommendations as recommendations_router
from routers import industries as industries_router

app = FastAPI(title="StockSignal API", version="0.1.0")

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


@app.get("/")
async def root():
    return {"status": "ok", "service": "StockSignal API"}
