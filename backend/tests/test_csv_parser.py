import pytest
from services.csv_parser import CSVParser, CSVParseError


@pytest.fixture
def parser():
    return CSVParser()


class TestColumnDetection:
    def test_detects_standard_columns(self, parser):
        fields = ["Symbol", "Quantity", "Price", "Date"]
        mapping = parser._detect_columns(fields)
        assert "symbol" in mapping
        assert "quantity" in mapping
        assert "price" in mapping
        assert "date" in mapping

    def test_detects_alternative_names(self, parser):
        fields = ["Ticker", "Shares", "Cost", "Bought"]
        mapping = parser._detect_columns(fields)
        assert "symbol" in mapping
        assert "quantity" in mapping
        assert "price" in mapping
        assert "date" in mapping

    def test_case_insensitive(self, parser):
        fields = ["SYMBOL", "QTY", "PRICE"]
        mapping = parser._detect_columns(fields)
        assert "symbol" in mapping
        assert "quantity" in mapping


class TestParsing:
    def test_valid_csv(self, parser):
        content = "Symbol,Quantity,Price,Date\nAAPL,10,150.00,2024-01-15\nMSFT,5,380.00,2024-02-01"
        result = parser.parse(content)
        assert result["total_rows"] == 2
        assert len(result["valid_rows"]) == 2

    def test_missing_symbol(self, parser):
        content = "Symbol,Quantity,Price\n,10,150.00"
        result = parser.parse(content)
        assert len(result["invalid_rows"]) == 1
        assert "Missing symbol" in result["invalid_rows"][0]["errors"]

    def test_invalid_quantity(self, parser):
        content = "Symbol,Quantity,Price\nAAPL,abc,150.00"
        result = parser.parse(content)
        assert len(result["invalid_rows"]) == 1

    def test_zero_quantity(self, parser):
        content = "Symbol,Quantity,Price\nAAPL,0,150.00"
        result = parser.parse(content)
        assert len(result["invalid_rows"]) == 1

    def test_optional_columns(self, parser):
        content = "Symbol,Quantity\nAAPL,10\nMSFT,5"
        result = parser.parse(content)
        assert result["total_rows"] == 2
        # Price and date are optional
        for row in result["valid_rows"]:
            assert row["purchase_currency"] == "USD"

    def test_empty_csv_raises(self, parser):
        with pytest.raises(CSVParseError):
            parser.parse("")

    def test_no_symbol_column_raises(self, parser):
        content = "Foo,Bar\n1,2"
        with pytest.raises(CSVParseError, match="Could not detect"):
            parser.parse(content)


class TestSymbolValidation:
    def test_validate_returns_dict(self, parser):
        # This would normally call yfinance, but we test the interface
        result = parser.validate_symbols(["AAPL"])
        assert isinstance(result, dict)
        assert "AAPL" in result
