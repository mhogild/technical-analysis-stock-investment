"""Router for stock/ETF recommendations endpoint."""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import logging

from services.recommendations_service import RecommendationsService
from models.recommendation import RecommendationsResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["recommendations"])

# Initialize the service
recommendations_service = RecommendationsService()


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    limit: int = Query(default=100, ge=1, le=100, description="Maximum number of recommendations"),
    industries: Optional[str] = Query(default=None, description="Comma-separated list of industry IDs to filter by"),
    etf_only: bool = Query(default=False, description="If true, only return ETFs"),
) -> RecommendationsResponse:
    """
    Get top buy signal recommendations.

    Returns a ranked list of stocks and ETFs with Buy or Strong Buy signals,
    sorted by signal strength (highest first).

    - **limit**: Maximum number of recommendations (1-100, default 100)
    - **industries**: Comma-separated industry IDs to filter (e.g., "technology,healthcare")
    - **etf_only**: If true, only return ETF recommendations
    """
    try:
        # Parse industries
        industry_list = None
        if industries:
            industry_list = [i.strip() for i in industries.split(",") if i.strip()]

        # Get recommendations
        response = recommendations_service.get_recommendations(
            limit=limit,
            industries=industry_list,
            etf_only=etf_only,
        )

        return response

    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch recommendations. Please try again later.",
        )


@router.post("/recommendations/refresh")
async def refresh_recommendations() -> dict:
    """
    Force refresh of all recommendations.

    This endpoint triggers a fresh scan of all stocks and ETFs in the universe.
    It should be called after market close to update recommendations with the latest data.
    """
    try:
        count = recommendations_service.refresh_recommendations()
        return {
            "success": True,
            "message": f"Refreshed recommendations. Found {count} buy signals.",
            "buy_signal_count": count,
        }
    except Exception as e:
        logger.error(f"Error refreshing recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to refresh recommendations.",
        )
