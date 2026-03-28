from __future__ import annotations

import hashlib
import re
import sqlite3
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
SAMPLE_DATA_DIR = DATA_DIR / "data_xlsx"
DEFAULT_WORKBOOK_DIR = SAMPLE_DATA_DIR
DEFAULT_DB_PATH = DATA_DIR / "crude_compass.sqlite3"
DEFAULT_SAMPLE_XLSX = SAMPLE_DATA_DIR / "_sample_crude_data.xlsx"
LEGACY_SAMPLE_XLSX = ROOT_DIR / "_sample_crude_data.xlsx"
DEFAULT_SAMPLE_XLSX_CANDIDATES = (
    DEFAULT_SAMPLE_XLSX,
    LEGACY_SAMPLE_XLSX,
)

GENERIC_DATASET_CODES = {
    "OPEC消费量预测值.xlsx": "opec_consumption_forecast",
    "原油期货价格（日）.xlsx": "crude_futures_daily",
    "原油现货价格（日）.xlsx": "crude_spot_daily",
    "成品油期货价格（日）.xlsx": "refined_futures_daily",
    "成品油柴油现货价格（日）.xlsx": "refined_diesel_spot_daily",
    "成品油汽油现货价格（日）.xlsx": "refined_gasoline_spot_daily",
    "成品油煤油现货价格（日）.xlsx": "refined_kerosene_spot_daily",
    "成品油燃料油现货价格（日）.xlsx": "refined_fuel_oil_spot_daily",
    "成品油石脑油现货价格（日）.xlsx": "refined_naphtha_spot_daily",
}

GENERIC_HEADER_MAP = {
    "name": "series_name",
    "简称": "series_name",
    "date": "trade_date",
    "日期": "trade_date",
    "close": "close_price",
    "收盘价": "close_price",
    "settlement": "settlement_price",
    "结算价": "settlement_price",
    "volume": "volume",
    "成交量": "volume",
    "price": "price",
    "价格": "price",
    "consumption": "consumption",
    "消费量": "consumption",
}

GENERIC_DIMENSION_KEYS = ("series_name", "trade_date")
GENERIC_METRIC_KEYS = (
    "close_price",
    "settlement_price",
    "volume",
    "price",
    "consumption",
)

GENERIC_PRIMARY_METRIC = {
    "opec_consumption_forecast": "consumption",
    "crude_futures_daily": "close_price",
    "crude_spot_daily": "price",
    "refined_futures_daily": "close_price",
    "refined_diesel_spot_daily": "price",
    "refined_gasoline_spot_daily": "price",
    "refined_kerosene_spot_daily": "price",
    "refined_fuel_oil_spot_daily": "price",
    "refined_naphtha_spot_daily": "price",
}

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


def resolve_sample_xlsx(sample_path: Path | str | None = None) -> Path:
    if sample_path is not None:
        return Path(sample_path)

    for candidate in DEFAULT_SAMPLE_XLSX_CANDIDATES:
        if candidate.exists():
            return candidate

    return DEFAULT_SAMPLE_XLSX


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
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS market_generic_daily_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_code TEXT NOT NULL,
                dataset_name TEXT NOT NULL,
                source_file TEXT NOT NULL,
                source_sheet TEXT NOT NULL,
                series_name TEXT NOT NULL,
                trade_date TEXT NOT NULL,
                metric_key TEXT NOT NULL,
                metric_value REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(dataset_code, series_name, trade_date, metric_key)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_market_generic_daily_metrics_lookup
            ON market_generic_daily_metrics(dataset_code, series_name, trade_date, metric_key)
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


def _column_reference_to_index(cell_reference: str) -> int:
    letters = "".join(character for character in cell_reference if character.isalpha())
    index = 0
    for character in letters:
        index = index * 26 + (ord(character.upper()) - 64)
    return max(index - 1, 0)


def _read_sheet_rows(
    zf: zipfile.ZipFile,
    target_path: str,
    shared_strings: list[str],
) -> list[list[str]]:
    sheet_root = ET.fromstring(zf.read(target_path))
    rows: list[list[str]] = []
    for row in sheet_root.findall("main:sheetData/main:row", _XML_NS):
        cells = row.findall("main:c", _XML_NS)
        if not cells:
            rows.append([])
            continue

        max_column_index = max(
            _column_reference_to_index(cell.attrib.get("r", "A1"))
            for cell in cells
        )
        values = [""] * (max_column_index + 1)
        for cell in cells:
            column_index = _column_reference_to_index(cell.attrib.get("r", "A1"))
            values[column_index] = _read_cell_value(cell, shared_strings)

        while values and not str(values[-1]).strip():
            values.pop()
        rows.append(values)

    return rows


def _normalize_header_label(raw_value: str) -> str:
    return str(raw_value or "").strip().lower()


def _excel_date_to_iso(raw_value: str) -> str:
    value = raw_value.strip()
    if not value:
        return ""

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    try:
        serial = float(value)
    except ValueError:
        return ""
    base = datetime(1899, 12, 30)
    return (base + timedelta(days=serial)).strftime("%Y-%m-%d")


def _to_float(raw_value: str) -> float | None:
    value = raw_value.strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _to_int(raw_value: str) -> int | None:
    value = raw_value.strip()
    if not value:
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


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
        raw_rows = _read_sheet_rows(zf, target_path, shared_strings)
        if not raw_rows:
            return rows

        headers = [str(value).strip() for value in raw_rows[0]]
        mapped_headers = [_HEADER_MAP.get(header, header) for header in headers]

        for row in raw_rows[1:]:
            values = [str(value) for value in row]
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


def _resolve_dataset_code(workbook_path: Path) -> str:
    mapped = GENERIC_DATASET_CODES.get(workbook_path.name)
    if mapped:
        return mapped

    ascii_slug = re.sub(r"[^0-9a-zA-Z]+", "_", workbook_path.stem).strip("_").lower()
    if ascii_slug:
        return ascii_slug

    digest = hashlib.sha1(workbook_path.name.encode("utf-8")).hexdigest()[:10]
    return f"dataset_{digest}"


def list_additional_market_workbooks(
    workbook_dir: Path | str = DEFAULT_WORKBOOK_DIR,
) -> list[Path]:
    directory = Path(workbook_dir)
    if not directory.exists():
        return []

    return sorted(
        path
        for path in directory.glob("*.xlsx")
        if path.name != DEFAULT_SAMPLE_XLSX.name and not path.name.startswith("~$")
    )


def _find_generic_sheet(
    zf: zipfile.ZipFile,
    shared_strings: list[str],
    sheet_name: str | None = None,
) -> tuple[str, list[list[str]], int, list[str]]:
    sheet_targets = _sheet_targets(zf)
    if sheet_name:
        sheet_targets = [item for item in sheet_targets if item[0] == sheet_name]
        if not sheet_targets:
            raise ValueError(f"Sheet not found: {sheet_name}")

    for target_name, target_path in sheet_targets:
        sheet_rows = _read_sheet_rows(zf, target_path, shared_strings)
        for header_index, row in enumerate(sheet_rows[:10]):
            mapped_headers = [
                GENERIC_HEADER_MAP.get(_normalize_header_label(value), "")
                for value in row
            ]
            if "series_name" in mapped_headers and "trade_date" in mapped_headers:
                metric_keys = [
                    header
                    for header in mapped_headers
                    if header and header not in GENERIC_DIMENSION_KEYS
                ]
                if metric_keys:
                    return target_name, sheet_rows, header_index, mapped_headers

    if sheet_name:
        raise ValueError(f"No structured data header found in sheet: {sheet_name}")
    raise ValueError("No structured data sheet found in workbook")


def _drop_incomplete_dates(
    rows: list[dict[str, object]],
    *,
    metric_keys: Iterable[str],
) -> tuple[list[dict[str, object]], list[str]]:
    metric_key_list = list(metric_keys)
    expected_series = {
        str(row["series_name"]).strip()
        for row in rows
        if str(row.get("series_name", "")).strip()
    }
    if not expected_series:
        return [], []

    rows_by_date: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        trade_date = str(row.get("trade_date", "")).strip()
        if trade_date:
            rows_by_date[trade_date].append(row)

    dropped_dates: set[str] = set()
    for trade_date, date_rows in rows_by_date.items():
        series_counter = Counter(str(row["series_name"]).strip() for row in date_rows)
        series_set = {series for series in series_counter if series}
        if series_set != expected_series or any(count != 1 for count in series_counter.values()):
            dropped_dates.add(trade_date)
            continue

        for row in date_rows:
            metrics = row.get("metrics", {})
            if any(metrics.get(metric_key) is None for metric_key in metric_key_list):
                dropped_dates.add(trade_date)
                break

    cleaned_rows = [
        row
        for row in rows
        if str(row.get("trade_date", "")).strip() not in dropped_dates
    ]
    return cleaned_rows, sorted(dropped_dates)


def _deduplicate_generic_rows(
    rows: list[dict[str, object]],
) -> tuple[list[dict[str, object]], int]:
    deduplicated_rows: list[dict[str, object]] = []
    seen_keys: set[tuple[object, ...]] = set()
    duplicate_count = 0

    for row in rows:
        metrics = row.get("metrics", {})
        metric_signature = tuple(sorted(metrics.items()))
        dedupe_key = (
            row.get("dataset_code"),
            row.get("series_name"),
            row.get("trade_date"),
            metric_signature,
        )
        if dedupe_key in seen_keys:
            duplicate_count += 1
            continue
        seen_keys.add(dedupe_key)
        deduplicated_rows.append(row)

    return deduplicated_rows, duplicate_count


def _canonicalize_generic_series_names(
    rows: list[dict[str, object]],
) -> list[dict[str, object]]:
    if not rows:
        return []

    grouped_rows: list[tuple[str, list[dict[str, object]]]] = []
    current_group: list[dict[str, object]] = []
    current_series_name: str | None = None

    for row in rows:
        series_name = str(row.get("series_name", "")).strip()
        if current_series_name is None or series_name == current_series_name:
            current_group.append(row)
            current_series_name = series_name
            continue

        grouped_rows.append((current_series_name, current_group))
        current_group = [row]
        current_series_name = series_name

    if current_group and current_series_name is not None:
        grouped_rows.append((current_series_name, current_group))

    canonical_groups: dict[str, list[tuple[tuple[object, ...], str]]] = defaultdict(list)
    normalized_rows: list[dict[str, object]] = []
    for base_series_name, group_rows in grouped_rows:
        group_signature = tuple(
            (
                row.get("trade_date"),
                tuple(sorted((row.get("metrics") or {}).items())),
            )
            for row in group_rows
        )
        existing_groups = canonical_groups[base_series_name]
        canonical_name = None
        for existing_signature, existing_name in existing_groups:
            if existing_signature == group_signature:
                canonical_name = existing_name
                break

        if canonical_name is None:
            occurrence_index = len(existing_groups) + 1
            canonical_name = (
                base_series_name
                if occurrence_index == 1
                else f"{base_series_name} [{occurrence_index}]"
            )
            existing_groups.append((group_signature, canonical_name))

        for row in group_rows:
            normalized_row = dict(row)
            normalized_row["series_name"] = canonical_name
            normalized_rows.append(normalized_row)

    return normalized_rows


def read_generic_market_workbook(
    excel_path: Path | str,
    sheet_name: str | None = None,
) -> dict[str, object]:
    workbook_path = Path(excel_path)
    if not workbook_path.exists():
        raise FileNotFoundError(f"Excel file not found: {workbook_path}")

    with zipfile.ZipFile(workbook_path) as zf:
        shared_strings = _load_shared_strings(zf)
        source_sheet, sheet_rows, header_index, mapped_headers = _find_generic_sheet(
            zf,
            shared_strings,
            sheet_name=sheet_name,
        )

    metric_keys = [
        header
        for header in mapped_headers
        if header and header not in GENERIC_DIMENSION_KEYS
    ]

    parsed_rows: list[dict[str, object]] = []
    for row in sheet_rows[header_index + 1 :]:
        if not any(str(value).strip() for value in row):
            continue

        raw_record: dict[str, str] = {}
        for index, header in enumerate(mapped_headers):
            if not header:
                continue
            raw_record[header] = str(row[index]).strip() if index < len(row) else ""

        series_name = str(raw_record.get("series_name", "")).strip()
        trade_date = _excel_date_to_iso(str(raw_record.get("trade_date", "")))
        if not series_name or not trade_date:
            continue

        metrics = {
            metric_key: _to_float(str(raw_record.get(metric_key, "")))
            for metric_key in metric_keys
        }
        parsed_rows.append(
            {
                "dataset_code": _resolve_dataset_code(workbook_path),
                "dataset_name": workbook_path.stem,
                "source_file": workbook_path.name,
                "source_sheet": source_sheet,
                "series_name": series_name,
                "trade_date": trade_date,
                "metrics": metrics,
            }
        )

    canonical_rows = _canonicalize_generic_series_names(parsed_rows)
    deduplicated_rows, duplicate_row_count = _deduplicate_generic_rows(canonical_rows)
    cleaned_rows, dropped_dates = _drop_incomplete_dates(
        deduplicated_rows,
        metric_keys=metric_keys,
    )

    return {
        "dataset_code": _resolve_dataset_code(workbook_path),
        "dataset_name": workbook_path.stem,
        "excel_path": str(workbook_path),
        "source_sheet": source_sheet,
        "metric_keys": metric_keys,
        "source_row_count": len(parsed_rows),
        "deduplicated_row_count": len(deduplicated_rows),
        "duplicate_row_count": duplicate_row_count,
        "clean_row_count": len(cleaned_rows),
        "dropped_date_count": len(dropped_dates),
        "dropped_dates": dropped_dates,
        "series_count": len({row["series_name"] for row in deduplicated_rows}),
        "rows": cleaned_rows,
    }


def replace_generic_market_rows(
    dataset_code: str,
    rows: Iterable[dict[str, object]],
    db_path: Path | str = DEFAULT_DB_PATH,
) -> int:
    materialized_rows = list(rows)
    init_market_database(db_path)
    with get_connection(db_path) as connection:
        connection.execute(
            """
            DELETE FROM market_generic_daily_metrics
            WHERE dataset_code = ?
            """,
            (dataset_code,),
        )

        payload = []
        for row in materialized_rows:
            metrics = row.get("metrics", {})
            for metric_key, metric_value in metrics.items():
                if metric_value is None:
                    continue
                payload.append(
                    (
                        row["dataset_code"],
                        row["dataset_name"],
                        row["source_file"],
                        row["source_sheet"],
                        row["series_name"],
                        row["trade_date"],
                        metric_key,
                        metric_value,
                    )
                )

        if payload:
            connection.executemany(
                """
                INSERT INTO market_generic_daily_metrics (
                    dataset_code,
                    dataset_name,
                    source_file,
                    source_sheet,
                    series_name,
                    trade_date,
                    metric_key,
                    metric_value
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(dataset_code, series_name, trade_date, metric_key) DO UPDATE SET
                    dataset_name = excluded.dataset_name,
                    source_file = excluded.source_file,
                    source_sheet = excluded.source_sheet,
                    metric_value = excluded.metric_value
                """,
                payload,
            )
    return len(payload)


def import_generic_market_workbook(
    excel_path: Path | str,
    db_path: Path | str = DEFAULT_DB_PATH,
    sheet_name: str | None = None,
) -> dict[str, object]:
    workbook = read_generic_market_workbook(excel_path, sheet_name=sheet_name)
    inserted_metric_rows = replace_generic_market_rows(
        workbook["dataset_code"],
        workbook["rows"],
        db_path=db_path,
    )

    return {
        "excel_path": workbook["excel_path"],
        "db_path": str(Path(db_path)),
        "dataset_code": workbook["dataset_code"],
        "dataset_name": workbook["dataset_name"],
        "source_sheet": workbook["source_sheet"],
        "series_count": workbook["series_count"],
        "source_row_count": workbook["source_row_count"],
        "deduplicated_row_count": workbook["deduplicated_row_count"],
        "duplicate_row_count": workbook["duplicate_row_count"],
        "clean_row_count": workbook["clean_row_count"],
        "metric_row_count": inserted_metric_rows,
        "dropped_date_count": workbook["dropped_date_count"],
        "dropped_dates": workbook["dropped_dates"],
        "metric_keys": workbook["metric_keys"],
    }


def import_all_market_data(
    db_path: Path | str = DEFAULT_DB_PATH,
    sample_path: Path | str | None = None,
    workbook_dir: Path | str = DEFAULT_WORKBOOK_DIR,
) -> dict[str, object]:
    summaries: list[dict[str, object]] = []
    sample_file = resolve_sample_xlsx(sample_path)
    if sample_file.exists():
        summaries.append(
            {
                "kind": "sample",
                "summary": import_market_data(sample_file, db_path=db_path),
            }
        )

    for workbook_path in list_additional_market_workbooks(workbook_dir):
        summaries.append(
            {
                "kind": "generic",
                "summary": import_generic_market_workbook(workbook_path, db_path=db_path),
            }
        )

    return {
        "db_path": str(Path(db_path)),
        "summaries": summaries,
    }


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
    sample_path: Path | str | None = None,
    db_path: Path | str = DEFAULT_DB_PATH,
) -> dict[str, object] | None:
    sample_file = resolve_sample_xlsx(sample_path)
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


def get_generic_primary_metric(dataset_code: str) -> str:
    return GENERIC_PRIMARY_METRIC.get(str(dataset_code or "").strip(), "price")


def get_generic_latest_metrics(
    dataset_code: str,
    db_path: Path | str = DEFAULT_DB_PATH,
    *,
    metric_key: str | None = None,
    series_names: Iterable[str] | None = None,
) -> list[dict[str, object]]:
    normalized_dataset_code = str(dataset_code or "").strip()
    if not normalized_dataset_code:
        return []

    primary_metric = str(metric_key or get_generic_primary_metric(normalized_dataset_code)).strip()
    requested_series_names = [
        str(series_name).strip()
        for series_name in (series_names or [])
        if str(series_name).strip()
    ]

    init_market_database(db_path)
    params: list[object] = [normalized_dataset_code]
    where_clauses = ["dataset_code = ?"]
    if requested_series_names:
        placeholders = ",".join("?" for _ in requested_series_names)
        where_clauses.append(f"series_name IN ({placeholders})")
        params.extend(requested_series_names)

    where_sql = " AND ".join(where_clauses)
    query = f"""
        SELECT dataset_code,
               dataset_name,
               source_file,
               source_sheet,
               series_name,
               trade_date,
               metric_key,
               metric_value
        FROM market_generic_daily_metrics
        WHERE {where_sql}
        ORDER BY series_name ASC, trade_date ASC
    """

    with get_connection(db_path) as connection:
        rows = connection.execute(query, params).fetchall()

    grouped_rows: dict[str, dict[str, dict[str, object]]] = defaultdict(dict)
    dataset_name = None
    source_file = None
    source_sheet = None
    for row in rows:
        dataset_name = dataset_name or row["dataset_name"]
        source_file = source_file or row["source_file"]
        source_sheet = source_sheet or row["source_sheet"]
        series_name = row["series_name"]
        trade_date = row["trade_date"]
        grouped_rows[series_name].setdefault(trade_date, {})
        grouped_rows[series_name][trade_date][row["metric_key"]] = row["metric_value"]

    if requested_series_names:
        ordered_series_names = requested_series_names
    else:
        ordered_series_names = sorted(grouped_rows)

    items: list[dict[str, object]] = []
    for series_name in ordered_series_names:
        date_map = grouped_rows.get(series_name, {})
        if not date_map:
            continue

        ordered_dates = sorted(date_map)
        latest_trade_date = ordered_dates[-1]
        latest_metrics = date_map[latest_trade_date]
        latest_value = latest_metrics.get(primary_metric)
        if latest_value is None:
            continue

        previous_value = None
        for trade_date in reversed(ordered_dates[:-1]):
            candidate = date_map[trade_date].get(primary_metric)
            if candidate is not None:
                previous_value = candidate
                break

        change = None
        change_pct = None
        if previous_value is not None:
            change = float(latest_value) - float(previous_value)
            change_pct = (change / float(previous_value) * 100) if previous_value else None

        items.append(
            {
                "dataset_code": normalized_dataset_code,
                "dataset_name": dataset_name,
                "source_file": source_file,
                "source_sheet": source_sheet,
                "series_name": series_name,
                "label": series_name,
                "trade_date": latest_trade_date,
                "metric_key": primary_metric,
                "value": float(latest_value),
                "change": round(change, 6) if change is not None else None,
                "change_pct": round(change_pct, 6) if change_pct is not None else None,
                "metrics": {
                    metric_name: float(metric_value)
                    for metric_name, metric_value in latest_metrics.items()
                    if metric_value is not None
                },
            }
        )

    return items


def get_generic_metric_series(
    dataset_code: str,
    series_name: str,
    db_path: Path | str = DEFAULT_DB_PATH,
    *,
    metric_key: str | None = None,
    limit: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, object]]:
    normalized_dataset_code = str(dataset_code or "").strip()
    normalized_series_name = str(series_name or "").strip()
    if not normalized_dataset_code or not normalized_series_name:
        return []

    primary_metric = str(metric_key or get_generic_primary_metric(normalized_dataset_code)).strip()

    init_market_database(db_path)
    params: list[object] = [normalized_dataset_code, normalized_series_name, primary_metric]
    where_clauses = [
        "dataset_code = ?",
        "series_name = ?",
        "metric_key = ?",
    ]
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
            SELECT dataset_code,
                   dataset_name,
                   source_file,
                   source_sheet,
                   series_name,
                   trade_date,
                   metric_key,
                   metric_value
            FROM market_generic_daily_metrics
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
            "dataset_code": row["dataset_code"],
            "dataset_name": row["dataset_name"],
            "source_file": row["source_file"],
            "source_sheet": row["source_sheet"],
            "series_name": row["series_name"],
            "trade_date": row["trade_date"],
            "metric_key": row["metric_key"],
            "value": row["metric_value"],
        }
        for row in rows
    ]
