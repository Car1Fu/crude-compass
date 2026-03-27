import json
import mimetypes
import os
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

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
        if self.path == "/health":
            self._send_json(200, {"ok": True})
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
    server = ThreadingHTTPServer((HOST, PORT), HedgeChatHandler)
    print(f"Hedge chat proxy listening on http://{HOST}:{PORT}")
    print(f"App page: http://{HOST}:{PORT}/")
    print(f"Health check: http://{HOST}:{PORT}/health")
    print(f"Chat endpoint: POST http://{HOST}:{PORT}/api/hedge-chat", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
