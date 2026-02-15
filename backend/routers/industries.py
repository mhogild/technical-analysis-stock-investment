"""Router for industry/sector classification endpoint."""

from fastapi import APIRouter

from services.industry_service import IndustryService
from models.industry import IndustriesResponse

router = APIRouter(prefix="/api", tags=["industries"])

# Initialize the service
industry_service = IndustryService()


@router.get("/industries", response_model=IndustriesResponse)
async def get_industries() -> IndustriesResponse:
    """
    Get all available industry and ETF category filters.

    Returns two lists:
    - **stock_industries**: Industry categories for filtering stocks
    - **etf_categories**: Category types for filtering ETFs
    """
    return industry_service.get_all_industries()
