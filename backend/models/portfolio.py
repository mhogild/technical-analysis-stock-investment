from pydantic import BaseModel
from typing import Optional


class CSVImportRow(BaseModel):
    row_number: int
    symbol: str
    quantity: float
    purchase_price: float
    purchase_date: Optional[str] = None
    purchase_currency: str = "USD"
    status: str = "valid"  # "valid", "unrecognized", "error"
    error_message: Optional[str] = None
    suggestion: Optional[str] = None


class ImportPreview(BaseModel):
    total_rows: int
    valid_rows: list[CSVImportRow]
    invalid_rows: list[CSVImportRow]
    recognized_count: int
    unrecognized_count: int


class ImportValidation(BaseModel):
    symbol: str
    is_valid: bool
    resolved_symbol: Optional[str] = None
    company_name: Optional[str] = None
    exchange: Optional[str] = None
