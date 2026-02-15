"""Industry classification and filtering service."""

from models.industry import Industry, IndustriesResponse


# Stock industry classifications
STOCK_INDUSTRIES = [
    Industry(id="technology", name="Technology/AI", type="stock_industry", icon="computer"),
    Industry(id="healthcare", name="Healthcare", type="stock_industry", icon="heart"),
    Industry(id="financials", name="Financials", type="stock_industry", icon="bank"),
    Industry(id="energy", name="Energy", type="stock_industry", icon="bolt"),
    Industry(id="consumer_discretionary", name="Consumer Discretionary", type="stock_industry", icon="shopping-bag"),
    Industry(id="consumer_staples", name="Consumer Staples", type="stock_industry", icon="shopping-cart"),
    Industry(id="industrials", name="Industrials", type="stock_industry", icon="factory"),
    Industry(id="materials", name="Materials", type="stock_industry", icon="cube"),
    Industry(id="utilities", name="Utilities", type="stock_industry", icon="lightbulb"),
    Industry(id="real_estate", name="Real Estate", type="stock_industry", icon="building"),
    Industry(id="communications", name="Communications", type="stock_industry", icon="signal"),
]

# ETF category classifications (IDs match frontend defaults)
ETF_CATEGORIES = [
    Industry(id="broad_market", name="Broad Market", type="etf_category", icon="chart-bar"),
    Industry(id="sector", name="Sector", type="etf_category", icon="layers"),
    Industry(id="bond", name="Bond", type="etf_category", icon="shield"),
    Industry(id="international", name="International", type="etf_category", icon="globe"),
    Industry(id="commodity", name="Commodity", type="etf_category", icon="gem"),
    Industry(id="thematic", name="Thematic/AI", type="etf_category", icon="sparkles"),
]

# Mapping from yfinance sector names to our industry IDs
SECTOR_TO_INDUSTRY = {
    "Technology": "technology",
    "Information Technology": "technology",
    "Software": "technology",
    "Semiconductors": "technology",
    "Consumer Electronics": "technology",
    "Healthcare": "healthcare",
    "Health Care": "healthcare",
    "Biotechnology": "healthcare",
    "Pharmaceuticals": "healthcare",
    "Medical Devices": "healthcare",
    "Financial Services": "financials",
    "Financial": "financials",
    "Banks": "financials",
    "Insurance": "financials",
    "Energy": "energy",
    "Oil & Gas": "energy",
    "Renewable Energy": "energy",
    "Consumer Cyclical": "consumer_discretionary",
    "Consumer Discretionary": "consumer_discretionary",
    "Retail": "consumer_discretionary",
    "Automobiles": "consumer_discretionary",
    "Consumer Defensive": "consumer_staples",
    "Consumer Staples": "consumer_staples",
    "Food & Beverage": "consumer_staples",
    "Household Products": "consumer_staples",
    "Industrials": "industrials",
    "Industrial": "industrials",
    "Aerospace & Defense": "industrials",
    "Machinery": "industrials",
    "Basic Materials": "materials",
    "Materials": "materials",
    "Chemicals": "materials",
    "Mining": "materials",
    "Utilities": "utilities",
    "Electric Utilities": "utilities",
    "Real Estate": "real_estate",
    "REITs": "real_estate",
    "Communication Services": "communications",
    "Communications": "communications",
    "Telecommunications": "communications",
    "Media": "communications",
}

# ETF category keywords for classification (IDs match frontend defaults)
ETF_CATEGORY_KEYWORDS = {
    "broad_market": ["s&p 500", "total market", "dow jones", "nasdaq-100", "russell", "wilshire", "crsp"],
    "sector": ["sector", "industry", "financials", "healthcare", "technology", "energy", "utilities"],
    "bond": ["bond", "treasury", "fixed income", "corporate bond", "municipal", "aggregate"],
    "international": ["international", "emerging markets", "developed markets", "europe", "asia", "global", "world"],
    "commodity": ["commodity", "gold", "silver", "oil", "natural resources", "metals", "agriculture"],
    "thematic": ["thematic", "ai", "artificial intelligence", "robotics", "clean energy", "innovation", "disruptive"],
}


class IndustryService:
    """Service for industry classification and filtering."""

    def get_all_industries(self) -> IndustriesResponse:
        """Get all available industry and ETF category filters."""
        return IndustriesResponse(
            stock_industries=STOCK_INDUSTRIES,
            etf_categories=ETF_CATEGORIES,
        )

    def classify_stock(self, sector: str | None, industry: str | None) -> str | None:
        """Classify a stock into one of our industry categories."""
        if not sector and not industry:
            return None

        # Try sector first
        if sector:
            mapped = SECTOR_TO_INDUSTRY.get(sector)
            if mapped:
                return mapped

        # Try industry
        if industry:
            mapped = SECTOR_TO_INDUSTRY.get(industry)
            if mapped:
                return mapped

            # Try partial matching for industry
            industry_lower = industry.lower()
            for key, value in SECTOR_TO_INDUSTRY.items():
                if key.lower() in industry_lower or industry_lower in key.lower():
                    return value

        return None

    def classify_etf(self, name: str | None, category: str | None) -> str | None:
        """Classify an ETF into one of our ETF categories."""
        text = f"{name or ''} {category or ''}".lower()

        if not text.strip():
            return "broad_market"  # Default for unknown ETFs

        # Check each category's keywords
        for cat_id, keywords in ETF_CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    return cat_id

        return "broad_market"  # Default

    def get_industry_by_id(self, industry_id: str) -> Industry | None:
        """Get an industry or ETF category by its ID."""
        all_industries = STOCK_INDUSTRIES + ETF_CATEGORIES
        for ind in all_industries:
            if ind.id == industry_id:
                return ind
        return None
