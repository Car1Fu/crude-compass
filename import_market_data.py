from __future__ import annotations

import argparse
from pathlib import Path

from market_data_store import DEFAULT_DB_PATH, DEFAULT_SAMPLE_XLSX, import_market_data


def resolve_default_excel_path() -> Path:
    if DEFAULT_SAMPLE_XLSX.exists():
        return DEFAULT_SAMPLE_XLSX
    raise FileNotFoundError(
        "No Excel source found. Expected workspace file: "
        f"{DEFAULT_SAMPLE_XLSX}"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Import local WTI/Brent sample data into SQLite."
    )
    parser.add_argument(
        "excel_path",
        nargs="?",
        default=None,
        help="Optional path to the source xlsx file.",
    )
    parser.add_argument(
        "--db-path",
        default=str(DEFAULT_DB_PATH),
        help="Path to the SQLite database file.",
    )
    parser.add_argument(
        "--sheet-name",
        default=None,
        help="Optional worksheet name. Defaults to the first sheet.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    excel_path = Path(args.excel_path) if args.excel_path else resolve_default_excel_path()

    summary = import_market_data(
        excel_path=excel_path,
        db_path=Path(args.db_path),
        sheet_name=args.sheet_name,
    )

    print("Market data import completed.")
    print(f"Excel file: {summary['excel_path']}")
    print(f"SQLite file: {summary['db_path']}")
    print(f"Imported rows: {summary['row_count']}")
    print(f"Dropped rows with empty open: {summary['dropped_missing_open']}")
    print(f"Deleted rows with empty open from SQLite: {summary['deleted_missing_open']}")
    print(f"Symbols: {summary['symbols']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
