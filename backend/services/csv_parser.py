import csv
import io
import re
from typing import Optional
import yfinance as yf


class CSVParseError(Exception):
    pass


class CSVParser:
    # Common column name mappings
    COLUMN_MAPS = {
        "symbol": ["symbol", "ticker", "stock", "code"],
        "quantity": ["quantity", "qty", "shares", "amount", "units"],
        "price": ["price", "cost", "purchase_price", "avg_cost", "cost_basis"],
        "date": ["date", "purchase_date", "bought", "acquired"],
        "currency": ["currency", "cur", "ccy"],
    }

    def parse(self, file_content: str) -> dict:
        """Parse CSV content and return an import preview."""
        try:
            reader = csv.DictReader(io.StringIO(file_content))
            if reader.fieldnames is None:
                raise CSVParseError("Empty or invalid CSV file")

            # Auto-detect column mappings
            mapping = self._detect_columns(reader.fieldnames)

            if "symbol" not in mapping:
                raise CSVParseError(
                    "Could not detect a symbol/ticker column. "
                    f"Found columns: {', '.join(reader.fieldnames)}"
                )

            valid_rows = []
            invalid_rows = []

            for row_num, row in enumerate(reader, start=2):
                parsed = self._parse_row(row, mapping, row_num)
                if parsed["valid"]:
                    valid_rows.append(parsed)
                else:
                    invalid_rows.append(parsed)

            return {
                "valid_rows": valid_rows,
                "invalid_rows": invalid_rows,
                "total_rows": len(valid_rows) + len(invalid_rows),
                "detected_columns": mapping,
            }
        except CSVParseError:
            raise
        except Exception as e:
            raise CSVParseError(f"Failed to parse CSV: {e}")

    def _detect_columns(
        self, fieldnames: list[str]
    ) -> dict[str, str]:
        """Auto-detect which CSV columns map to our expected fields."""
        mapping = {}
        normalized = {name: name.strip().lower().replace(" ", "_") for name in fieldnames}

        for our_field, aliases in self.COLUMN_MAPS.items():
            for col_name, norm_name in normalized.items():
                if norm_name in aliases:
                    mapping[our_field] = col_name
                    break

        return mapping

    def _parse_row(
        self, row: dict, mapping: dict[str, str], row_num: int
    ) -> dict:
        """Parse and validate a single CSV row."""
        result = {"row_number": row_num, "valid": True, "errors": []}

        # Symbol (required)
        symbol_col = mapping.get("symbol")
        symbol = row.get(symbol_col, "").strip().upper() if symbol_col else ""
        if not symbol:
            result["valid"] = False
            result["errors"].append("Missing symbol")
        result["symbol"] = symbol

        # Quantity (required)
        qty_col = mapping.get("quantity")
        try:
            quantity = float(row.get(qty_col, "").strip()) if qty_col else 0
            if quantity <= 0:
                result["valid"] = False
                result["errors"].append("Quantity must be greater than 0")
        except ValueError:
            quantity = 0
            result["valid"] = False
            result["errors"].append(f"Invalid quantity: {row.get(qty_col, '')}")
        result["quantity"] = quantity

        # Price (optional)
        price_col = mapping.get("price")
        try:
            price_str = row.get(price_col, "").strip() if price_col else ""
            price = float(re.sub(r"[^\d.]", "", price_str)) if price_str else 0
        except ValueError:
            price = 0
            result["errors"].append(f"Invalid price: {row.get(price_col, '')}")
        result["purchase_price"] = price

        # Date (optional)
        date_col = mapping.get("date")
        date_str = row.get(date_col, "").strip() if date_col else ""
        result["purchase_date"] = date_str if date_str else None

        # Currency (optional)
        currency_col = mapping.get("currency")
        result["purchase_currency"] = (
            row.get(currency_col, "USD").strip().upper() if currency_col else "USD"
        )

        return result

    def validate_symbols(self, symbols: list[str]) -> dict[str, Optional[str]]:
        """Batch validate ticker symbols against yfinance."""
        results = {}
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                if info and info.get("regularMarketPrice") is not None:
                    results[symbol] = info.get("longName", symbol)
                else:
                    results[symbol] = None
            except Exception:
                results[symbol] = None
        return results
