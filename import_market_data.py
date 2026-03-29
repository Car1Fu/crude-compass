from __future__ import annotations

import argparse
from pathlib import Path

from market_data_store import (
    DEFAULT_DB_PATH,
    DEFAULT_SAMPLE_XLSX_CANDIDATES,
    import_all_market_data,
    import_generic_market_workbook,
    import_market_data,
    resolve_sample_xlsx,
    split_macro_indicator_csv,
)


def resolve_default_excel_path() -> Path:
    resolved = resolve_sample_xlsx()
    if resolved.exists():
        return resolved

    candidate_text = ", ".join(str(path) for path in DEFAULT_SAMPLE_XLSX_CANDIDATES)
    raise FileNotFoundError(
        "No Excel source found. Checked: "
        f"{candidate_text}"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Import local WTI/Brent sample data into SQLite."
    )
    parser.add_argument(
        "excel_path",
        nargs="?",
        default=None,
        help="Optional path to the source xlsx/csv file.",
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
    db_path = Path(args.db_path)

    if args.excel_path:
        excel_path = Path(args.excel_path)
        if excel_path.name == "_sample_crude_data.xlsx":
            summary = import_market_data(
                excel_path=excel_path,
                db_path=db_path,
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

        if excel_path.name == "宏观指标_汇总.csv":
            split_summaries = split_macro_indicator_csv(
                source_path=excel_path,
                output_dir=excel_path.parent,
            )
            for split_summary in split_summaries:
                summary = import_generic_market_workbook(
                    excel_path=split_summary["output_path"],
                    db_path=db_path,
                )
                print("Macro indicator split import completed.")
                print(f"Source csv: {excel_path}")
                print(f"Split file: {summary['excel_path']}")
                print(f"Dataset: {summary['dataset_code']}")
                print(f"Series: {summary['series_count']}")
                print(f"Source rows: {summary['source_row_count']}")
                print(f"Imported metric rows: {summary['metric_row_count']}")
            return 0

        summary = import_generic_market_workbook(
            excel_path=excel_path,
            db_path=db_path,
            sheet_name=args.sheet_name,
        )
        print("Generic market workbook import completed.")
        print(f"Excel file: {summary['excel_path']}")
        print(f"SQLite file: {summary['db_path']}")
        print(f"Dataset: {summary['dataset_code']}")
        print(f"Sheet: {summary['source_sheet']}")
        print(f"Series: {summary['series_count']}")
        print(f"Source rows: {summary['source_row_count']}")
        print(f"Duplicate rows removed: {summary['duplicate_row_count']}")
        print(f"Clean rows: {summary['clean_row_count']}")
        print(f"Imported metric rows: {summary['metric_row_count']}")
        print(f"Dropped dates: {summary['dropped_date_count']}")
        return 0

    overall_summary = import_all_market_data(db_path=db_path)
    print("Market data import completed.")
    print(f"SQLite file: {overall_summary['db_path']}")
    for item in overall_summary["summaries"]:
        kind = item["kind"]
        summary = item["summary"]
        if kind == "sample":
            print(
                f"[sample] {Path(summary['excel_path']).name}: "
                f"rows={summary['row_count']}, "
                f"dropped_empty_open={summary['dropped_missing_open']}, "
                f"symbols={summary['symbols']}"
            )
            continue

        if kind == "error":
            print(
                f"[skip] {Path(summary['excel_path']).name}: "
                f"error={summary['error']}"
            )
            continue

        print(
            f"[generic] {Path(summary['excel_path']).name}: "
            f"dataset={summary['dataset_code']}, "
            f"series={summary['series_count']}, "
            f"deduped={summary['duplicate_row_count']}, "
            f"clean_rows={summary['clean_row_count']}, "
            f"metric_rows={summary['metric_row_count']}, "
            f"dropped_dates={summary['dropped_date_count']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
