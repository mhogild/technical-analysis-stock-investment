from fastapi import APIRouter, UploadFile, File, HTTPException
from services.csv_parser import CSVParser, CSVParseError

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])
csv_parser = CSVParser()


@router.post("/import")
async def import_portfolio_csv(file: UploadFile = File(...)):
    """Parse and validate a CSV file for portfolio import."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    try:
        content = await file.read()
        text = content.decode("utf-8-sig")  # Handle BOM
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file content")

    try:
        preview = csv_parser.parse(text)
    except CSVParseError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Validate symbols for valid rows
    symbols = [r["symbol"] for r in preview["valid_rows"] if r.get("symbol")]
    if symbols:
        validations = csv_parser.validate_symbols(list(set(symbols)))
        for row in preview["valid_rows"]:
            name = validations.get(row["symbol"])
            row["company_name"] = name
            if name is None:
                row["valid"] = False
                row["errors"].append(f"Unrecognized ticker: {row['symbol']}")
                preview["invalid_rows"].append(row)

        preview["valid_rows"] = [r for r in preview["valid_rows"] if r["valid"]]

    return preview
