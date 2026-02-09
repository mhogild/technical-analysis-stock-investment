from fastapi import APIRouter, Query
from services.search_service import SearchService
from models.stock import SearchResult

router = APIRouter(prefix="/api", tags=["search"])
search_service = SearchService()


@router.get("/search", response_model=list[SearchResult])
async def search_stocks(q: str = Query(..., min_length=1)):
    return search_service.search(q)
