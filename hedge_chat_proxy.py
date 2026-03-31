import json
import mimetypes
import os
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from market_data_store import (
    DEFAULT_DB_PATH,
    bootstrap_news_database,
    bootstrap_sample_database,
    bootstrap_supply_tracking_database,
    get_generic_latest_metrics,
    get_generic_metric_series,
    get_latest_snapshots,
    get_news_items,
    get_price_series,
    get_supply_country_details,
    get_supply_dashboard_data,
    get_supply_ports_data,
    get_supply_tracking_data,
    normalize_symbol,
)
from openrouter_config import OPENROUTER_MODEL, build_openrouter_client


HOST = os.environ.get("HEDGE_CHAT_HOST", "127.0.0.1")
PORT = int(os.environ.get("HEDGE_CHAT_PORT", "8008"))
ROOT_DIR = Path(__file__).resolve().parent


def _extract_text(message_content):
    if isinstance(message_content, str):
        return message_content.strip()
    if isinstance(message_content, list):
        chunks = []
        for item in message_content:
            if isinstance(item, str):
                chunks.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                chunks.append(item["text"])
        return "".join(chunks).strip()
    return ""


def _extract_stream_text(stream):
    chunks = []
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if not delta:
            continue
        if isinstance(delta, str):
            chunks.append(delta)
        elif isinstance(delta, list):
            for item in delta:
                if isinstance(item, str):
                    chunks.append(item)
                elif isinstance(item, dict) and isinstance(item.get("text"), str):
                    chunks.append(item["text"])
    return "".join(chunks).strip()


def _coerce_positive_int(value, default=None):
    try:
        parsed = int(str(value))
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


class HedgeChatHandler(BaseHTTPRequestHandler):
    server_version = "HedgeChatProxy/0.1"

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path: Path):
        try:
            data = file_path.read_bytes()
        except OSError:
            self._send_json(404, {"error": "Not found"})
            return

        mime_type, _ = mimetypes.guess_type(str(file_path))
        self.send_response(200)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _resolve_static_path(self):
        parsed = urlparse(self.path)
        raw_path = unquote(parsed.path)
        rel_path = "index.html" if raw_path in {"", "/"} else raw_path.lstrip("/")
        candidate = (ROOT_DIR / rel_path).resolve()
        try:
            candidate.relative_to(ROOT_DIR)
        except ValueError:
            return None
        if not candidate.is_file():
            return None
        return candidate

    def do_OPTIONS(self):
        print("[hedge-chat-proxy] OPTIONS", self.path, flush=True)
        self._send_json(204, {})

    def do_GET(self):
        print("[hedge-chat-proxy] GET", self.path, flush=True)
        parsed = urlparse(self.path)
        route = parsed.path
        query = parse_qs(parsed.query)

        if route == "/health":
            self._send_json(200, {"ok": True})
            return

        if route == "/api/market/snapshot":
            snapshots = get_latest_snapshots(db_path=DEFAULT_DB_PATH)
            self._send_json(
                200,
                {
                    "items": snapshots,
                    "as_of": snapshots[0]["trade_date"] if snapshots else None,
                },
            )
            return

        if route == "/api/market/series":
            symbol = normalize_symbol((query.get("symbol") or ["WTI"])[0])
            limit = _coerce_positive_int((query.get("limit") or [None])[0], default=260)
            date_from = (query.get("date_from") or [None])[0]
            date_to = (query.get("date_to") or [None])[0]
            if not symbol:
                self._send_json(400, {"error": "symbol must be WTI or Brent"})
                return
            rows = get_price_series(
                symbol,
                db_path=DEFAULT_DB_PATH,
                limit=limit,
                date_from=date_from,
                date_to=date_to,
            )
            self._send_json(
                200,
                {
                    "symbol": symbol,
                    "rows": rows,
                },
            )
            return

        if route == "/api/price-board/quotes":
            snapshots = get_latest_snapshots(db_path=DEFAULT_DB_PATH)
            self._send_json(
                200,
                {
                    "items": snapshots,
                    "as_of": snapshots[0]["trade_date"] if snapshots else None,
                },
            )
            return

        if route == "/api/price-board/generic/latest":
            dataset_code = (query.get("dataset_code") or [""])[0].strip()
            metric_key = (query.get("metric_key") or [None])[0]
            series_names = query.get("series_name") or None
            if not dataset_code:
                self._send_json(400, {"error": "dataset_code is required"})
                return

            items = get_generic_latest_metrics(
                dataset_code,
                db_path=DEFAULT_DB_PATH,
                metric_key=metric_key,
                series_names=series_names,
            )
            self._send_json(
                200,
                {
                    "dataset_code": dataset_code,
                    "metric_key": metric_key,
                    "items": items,
                    "as_of": items[0]["trade_date"] if items else None,
                },
            )
            return

        if route == "/api/price-board/generic/series":
            dataset_code = (query.get("dataset_code") or [""])[0].strip()
            series_name = (query.get("series_name") or [""])[0].strip()
            metric_key = (query.get("metric_key") or [None])[0]
            limit = _coerce_positive_int((query.get("limit") or [None])[0], default=5000)
            date_from = (query.get("date_from") or [None])[0]
            date_to = (query.get("date_to") or [None])[0]
            if not dataset_code or not series_name:
                self._send_json(400, {"error": "dataset_code and series_name are required"})
                return

            rows = get_generic_metric_series(
                dataset_code,
                series_name,
                db_path=DEFAULT_DB_PATH,
                metric_key=metric_key,
                limit=limit,
                date_from=date_from,
                date_to=date_to,
            )
            self._send_json(
                200,
                {
                    "dataset_code": dataset_code,
                    "series_name": series_name,
                    "metric_key": metric_key,
                    "rows": rows,
                },
            )
            return

        if route == "/api/price-board/kline":
            raw_symbol = (query.get("symbol") or query.get("product") or ["WTI"])[0]
            symbol = normalize_symbol(raw_symbol)
            limit = _coerce_positive_int((query.get("limit") or [None])[0], default=365)
            if not symbol:
                self._send_json(400, {"error": "symbol must be WTI or Brent"})
                return
            rows = get_price_series(symbol, db_path=DEFAULT_DB_PATH, limit=limit)
            self._send_json(
                200,
                {
                    "symbol": symbol,
                    "rows": rows,
                },
            )
            return

        if route == "/api/news/list":
            section_key = (query.get("section_key") or query.get("theme") or [None])[0]
            limit = _coerce_positive_int((query.get("limit") or [None])[0], default=200)
            items = get_news_items(
                section_key=section_key,
                limit=limit,
                db_path=DEFAULT_DB_PATH,
            )
            self._send_json(
                200,
                {
                    "section_key": section_key,
                    "total": len(items),
                    "items": items,
                },
            )
            return

        if route == "/api/supply/dashboard":
            payload = get_supply_dashboard_data(db_path=DEFAULT_DB_PATH)
            payload["countryDetails"] = get_supply_country_details(db_path=DEFAULT_DB_PATH)
            self._send_json(200, payload)
            return

        if route == "/api/supply/ports":
            self._send_json(200, get_supply_ports_data(db_path=DEFAULT_DB_PATH))
            return

        if route == "/api/supply/tracking":
            self._send_json(200, get_supply_tracking_data(db_path=DEFAULT_DB_PATH))
            return

        static_path = self._resolve_static_path()
        if static_path is None:
            self._send_json(404, {"error": "Not found"})
            return
        self._send_file(static_path)

    def do_POST(self):
        if self.path != "/api/hedge-chat":
            self._send_json(404, {"error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length) if length > 0 else b"{}"
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, json.JSONDecodeError):
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        messages = payload.get("messages")
        model = payload.get("model") or OPENROUTER_MODEL
        if not isinstance(messages, list) or not messages:
            self._send_json(400, {"error": "messages must be a non-empty list"})
            return

        print(
            f"[hedge-chat-proxy] POST /api/hedge-chat model={model} messages={len(messages)}",
            flush=True,
        )
        try:
            client = build_openrouter_client()
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            reply = _extract_stream_text(stream)
            if not reply:
                raise ValueError("Empty model reply")
        except Exception as exc:  # pragma: no cover
            print("[hedge-chat-proxy] OpenRouter request failed:")
            print(traceback.format_exc(), flush=True)
            self._send_json(502, {"error": f"{type(exc).__name__}: {exc}"})
            return

        print("[hedge-chat-proxy] Reply sent successfully", flush=True)
        self._send_json(200, {"reply": reply})

    def log_message(self, format, *args):
        return


def main():
    bootstrap_summary = bootstrap_sample_database(db_path=DEFAULT_DB_PATH)
    if bootstrap_summary:
        print(
            "[hedge-chat-proxy] Bootstrapped SQLite market data "
            f"from {bootstrap_summary['excel_path']} "
            f"({bootstrap_summary['row_count']} rows)",
            flush=True,
        )
    supply_tracking_summary = bootstrap_supply_tracking_database(db_path=DEFAULT_DB_PATH)
    if supply_tracking_summary:
        print(
            "[hedge-chat-proxy] Bootstrapped SQLite supply tracking data "
            f"from {supply_tracking_summary['excel_path']} "
            f"({supply_tracking_summary['tracking_row_count']} rows)",
            flush=True,
        )
    news_summary = bootstrap_news_database(db_path=DEFAULT_DB_PATH)
    if news_summary:
        print(
            "[hedge-chat-proxy] Bootstrapped SQLite news data "
            f"from {news_summary['excel_path']} "
            f"({news_summary['news_row_count']} rows)",
            flush=True,
        )
    server = ThreadingHTTPServer((HOST, PORT), HedgeChatHandler)
    print(f"Hedge chat proxy listening on http://{HOST}:{PORT}")
    print(f"App page: http://{HOST}:{PORT}/")
    print(f"Health check: http://{HOST}:{PORT}/health")
    print(f"Chat endpoint: POST http://{HOST}:{PORT}/api/hedge-chat", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
