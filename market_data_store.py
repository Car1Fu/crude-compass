from __future__ import annotations

import sqlite3
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
DEFAULT_DB_PATH = DATA_DIR / "crude_compass.sqlite3"
DEFAULT_SAMPLE_XLSX = ROOT_DIR / "_sample_crude_data.xlsx"

_XML_NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

_HEADER_MAP = {
    "variable": "symbol",
    "date": "trade_date",
    "cha": "change",
    "per_cha": "change_pct",
    "open": "open_price",
    "high": "high_price",
    "low": "low_price",
    "close": "close_price",
    "volume": "volume",
}


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection(db_path: Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    ensure_data_dir()
    connection = sqlite3.connect(Path(db_path))
    connection.row_factory = sqlite3.Row
    return connection


def init_market_database(db_path: Path | str = DEFAULT_DB_PATH) -> None:
    with get_connection(db_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS market_daily_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                trade_date TEXT NOT NULL,
                change REAL,
                change_pct REAL,
                open_price REAL,
                high_price REAL,
                low_price REAL,
                close_price REAL,
                volume INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(symbol, trade_date)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_market_daily_prices_symbol_date
            ON market_daily_prices(symbol, trade_date)
            """
        )


def normalize_symbol(symbol: str | None) -> str | None:
    if symbol is None:
        return None
    normalized = str(symbol).strip().lower()
    if normalized == "wti":
        return "WTI"
    if normalized == "brent":
        return "Brent"
    return None


def _load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []

    shared_strings_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    shared_strings: list[str] = []
    for item in shared_strings_root.findall("main:si", _XML_NS):
        chunks = [node.text or "" for node in item.findall(".//main:t", _XML_NS)]
        shared_strings.append("".join(chunks))
    return shared_strings


def _sheet_targets(zf: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook_root = ET.fromstring(zf.read("xl/workbook.xml"))
    rels_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels_root.findall("rel:Relationship", _XML_NS)
    }

    targets: list[tuple[str, str]] = []
    for sheet in workbook_root.findall("main:sheets/main:sheet", _XML_NS):
        name = sheet.attrib.get("name", "Sheet1")
        rel_id = sheet.attrib.get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )
        if not rel_id or rel_id not in rel_map:
            continue
        target = rel_map[rel_id]
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        targets.append((name, target))
    return targets


def _read_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("main:v", _XML_NS)
    if value_node is None:
        inline_node = cell.find("main:is", _XML_NS)
        if inline_node is None:
            return ""
        chunks = [node.text or "" for node in inline_node.findall(".//main:t", _XML_NS)]
        return "".join(chunks)

    raw_value = value_node.text or ""
    if cell_type == "s" and raw_value:
        return shared_strings[int(raw_value)]
    return raw_value


def _excel_date_to_iso(raw_value: str) -> str:
    value = raw_value.strip()
    if not value:
        return ""

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    serial = float(value)
    base = datetime(1899, 12, 30)
    return (base + timedelta(days=serial)).strftime("%Y-%m-%d")


def _to_float(raw_value: str) -> float | None:
    value = raw_value.strip()
    if not value:
        return None
    return float(value)


def _to_int(raw_value: str) -> int | None:
    value = raw_value.strip()
    if not value:
        return None
    return int(float(value))


def read_market_rows_from_xlsx(
    excel_path: Path | str,
    sheet_name: str | None = None,
) -> list[dict[str, object]]:
    xlsx_path = Path(excel_path)
    if not xlsx_path.exists():
        raise FileNotFoundError(f"Excel file not found: {xlsx_path}")

    rows: list[dict[str, object]] = []
    with zipfile.ZipFile(xlsx_path) as zf:
        shared_strings = _load_shared_strings(zf)
        sheet_targets = _sheet_targets(zf)
        if sheet_name:
            sheet_targets = [item for item in sheet_targets if item[0] == sheet_name]
            if not sheet_targets:
                raise ValueError(f"Sheet not found: {sheet_name}")

        target_name, target_path = sheet_targets[0]
        sheet_root = ET.fromstring(zf.read(target_path))
        raw_rows = sheet_root.findall("main:sheetData/main:row", _XML_NS)
        if not raw_rows:
            return rows

        header_cells = raw_rows[0].findall("main:c", _XML_NS)
        headers = [_read_cell_value(cell, shared_strings).strip() for cell in header_cells]
        mapped_headers = [_HEADER_MAP.get(header, header) for header in headers]

        for row in raw_rows[1:]:
            cells = row.findall("main:c", _XML_NS)
            values = [_read_cell_value(cell, shared_strings) for cell in cells]
            if not values:
                continue

            raw_record = dict(zip(mapped_headers, values))
            symbol = normalize_symbol(raw_record.get("symbol"))
            if symbol is None:
                continue

            record = {
                "symbol": symbol,
                "trade_date": _excel_date_to_iso(str(raw_record.get("trade_date", ""))),
                "change": _to_float(str(raw_record.get("change", ""))),
                "change_pct": _to_float(str(raw_record.get("change_pct", ""))),
                "open_price": _to_float(str(raw_record.get("open_price", ""))),
                "high_price": _to_float(str(raw_record.get("high_price", ""))),
                "low_price": _to_float(str(raw_record.get("low_price", ""))),
                "close_price": _to_float(str(raw_record.get("close_price", ""))),
                "volume": _to_int(str(raw_record.get("volume", ""))),
                "source_sheet": target_name,
            }
            if record["trade_date"]:
                rows.append(record)

    return rows


def upsert_market_rows(
    rows: Iterable[dict[str, object]],
    db_path: Path | str = DEFAULT_DB_PATH,
) -> int:
    payload = [
        (
            row["symbol"],
            row["trade_date"],
            row["change"],
            row["change_pct"],
            row["open_price"],
            row["high_price"],
            row["low_price"],
            row["close_price"],
            row["volume"],
        )
        for row in rows
    ]
    if not payload:
        return 0

    init_market_database(db_path)
    with get_connection(db_path) as connection:
        connection.executemany(
            """
            INSERT INTO market_daily_prices (
                symbol,
                trade_date,
                change,
                change_pct,
                open_price,
                high_price,
                low_price,
                close_price,
                volume
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol, trade_date) DO UPDATE SET
                change = excluded.change,
                change_pct = excluded.change_pct,
                open_price = excluded.open_price,
                high_price = excluded.high_price,
                low_price = excluded.low_price,
                close_price = excluded.close_price,
                volume = excluded.volume
            """,
            payload,
        )
    return len(payload)


def delete_market_rows_by_keys(
    rows: Iterable[dict[str, object]],
    db_path: Path | str = DEFAULT_DB_PATH,
) -> int:
    payload = []
    for row in rows:
        symbol = row.get("symbol")
        trade_date = row.get("trade_date")
        if symbol and trade_date:
            payload.append((symbol, trade_date))

    if not payload:
        return 0

    init_market_database(db_path)
    with get_connection(db_path) as connection:
        cursor = connection.executemany(
            """
            DELETE FROM market_daily_prices
            WHERE symbol = ? AND trade_date = ?
            """,
            payload,
        )
        return cursor.rowcount if cursor.rowcount is not None else 0


def delete_rows_with_missing_open(
    db_path: Path | str = DEFAULT_DB_PATH,
) -> int:
    init_market_database(db_path)
    with get_connection(db_path) as connection:
        cursor = connection.execute(
            """
            DELETE FROM market_daily_prices
            WHERE open_price IS NULL
            """
        )
        return cursor.rowcount if cursor.rowcount is not None else 0


def import_market_data(
    excel_path: Path | str,
    db_path: Path | str = DEFAULT_DB_PATH,
    sheet_name: str | None = None,
) -> dict[str, object]:
    rows = read_market_rows_from_xlsx(excel_path, sheet_name=sheet_name)
    dropped_rows = [row for row in rows if row.get("open_price") is None]
    valid_rows = [row for row in rows if row.get("open_price") is not None]

    deleted_missing_open_keys = delete_market_rows_by_keys(dropped_rows, db_path=db_path)
    inserted = upsert_market_rows(valid_rows, db_path=db_path)
    deleted_missing_open_legacy = delete_rows_with_missing_open(db_path=db_path)

    by_symbol: dict[str, int] = defaultdict(int)
    for row in valid_rows:
        by_symbol[str(row["symbol"])] += 1

    return {
        "excel_path": str(Path(excel_path)),
        "db_path": str(Path(db_path)),
        "row_count": inserted,
        "dropped_missing_open": len(dropped_rows),
        "deleted_missing_open": deleted_missing_open_keys + deleted_missing_open_legacy,
        "symbols": dict(sorted(by_symbol.items())),
    }


def count_market_rows(db_path: Path | str = DEFAULT_DB_PATH) -> int:
    init_market_database(db_path)
    with get_connection(db_path) as connection:
        row = connection.execute("SELECT COUNT(*) AS count FROM market_daily_prices").fetchone()
    return int(row["count"]) if row else 0


def bootstrap_sample_database(
    sample_path: Path | str = DEFAULT_SAMPLE_XLSX,
    db_path: Path | str = DEFAULT_DB_PATH,
) -> dict[str, object] | None:
    sample_file = Path(sample_path)
    if count_market_rows(db_path) > 0:
        return None
    if not sample_file.exists():
        return None
    return import_market_data(sample_file, db_path=db_path)


def get_latest_snapshots(
    symbols: Iterable[str] | None = None,
    db_path: Path | str = DEFAULT_DB_PATH,
) -> list[dict[str, object]]:
    init_market_database(db_path)
    normalized_symbols = [normalize_symbol(symbol) for symbol in symbols or ("WTI", "Brent")]
    normalized_symbols = [symbol for symbol in normalized_symbols if symbol]
    placeholders = ",".join("?" for _ in normalized_symbols)

    query = f"""
        SELECT price.symbol,
               price.trade_date,
               price.change,
               price.change_pct,
               price.open_price,
               price.high_price,
               price.low_price,
               price.close_price,
               price.volume
        FROM market_daily_prices AS price
        INNER JOIN (
            SELECT symbol, MAX(trade_date) AS max_trade_date
            FROM market_daily_prices
            WHERE symbol IN ({placeholders})
            GROUP BY symbol
        ) AS latest
        ON latest.symbol = price.symbol
       AND latest.max_trade_date = price.trade_date
        ORDER BY CASE price.symbol
            WHEN 'WTI' THEN 1
            WHEN 'Brent' THEN 2
            ELSE 99
        END
    """

    with get_connection(db_path) as connection:
        rows = connection.execute(query, normalized_symbols).fetchall()

    return [
        {
            "symbol": row["symbol"],
            "label": row["symbol"],
            "trade_date": row["trade_date"],
            "change": row["change"],
            "change_pct": row["change_pct"],
            "open_price": row["open_price"],
            "high_price": row["high_price"],
            "low_price": row["low_price"],
            "close_price": row["close_price"],
            "volume": row["volume"],
        }
        for row in rows
    ]


def get_price_series(
    symbol: str,
    db_path: Path | str = DEFAULT_DB_PATH,
    *,
    limit: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, object]]:
    normalized_symbol = normalize_symbol(symbol)
    if not normalized_symbol:
        return []

    init_market_database(db_path)
    params: list[object] = [normalized_symbol]
    where_clauses = ["symbol = ?"]
    if date_from:
        where_clauses.append("trade_date >= ?")
        params.append(date_from)
    if date_to:
        where_clauses.append("trade_date <= ?")
        params.append(date_to)

    where_sql = " AND ".join(where_clauses)
    limit_sql = ""
    if limit and limit > 0:
        limit_sql = "LIMIT ?"
        params.append(int(limit))

    query = f"""
        SELECT *
        FROM (
            SELECT symbol,
                   trade_date,
                   change,
                   change_pct,
                   open_price,
                   high_price,
                   low_price,
                   close_price,
                   volume
            FROM market_daily_prices
            WHERE {where_sql}
            ORDER BY trade_date DESC
            {limit_sql}
        ) AS recent
        ORDER BY trade_date ASC
    """

    with get_connection(db_path) as connection:
        rows = connection.execute(query, params).fetchall()

    return [
        {
            "symbol": row["symbol"],
            "trade_date": row["trade_date"],
            "change": row["change"],
            "change_pct": row["change_pct"],
            "open_price": row["open_price"],
            "high_price": row["high_price"],
            "low_price": row["low_price"],
            "close_price": row["close_price"],
            "volume": row["volume"],
        }
        for row in rows
    ]
