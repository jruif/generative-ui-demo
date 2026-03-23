import json
import logging
import os
from datetime import datetime
from pathlib import Path

import anthropic
import json_repair
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from tools import FEATURE_FLAGS, get_tools
from system import SYSTEM_PROMPT

app = FastAPI()
client = anthropic.AsyncAnthropic()

GUIDELINES_DIR = Path(__file__).parent / "guidelines"
COMPONENT_DOCS_DIR = Path(__file__).parent / "component-docs"
LOG_DIR = Path(__file__).parent / "log"

WIDGET_DELTA_THRESHOLD = 50

# ── Logging ────────────────────────────────────────────────────────────────

LOG_DIR.mkdir(parents=True, exist_ok=True)
_log_file = LOG_DIR / "server.log"
_fh = logging.FileHandler(_log_file, encoding="utf-8")
_fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
logger = logging.getLogger("generative_ui")
logger.setLevel(logging.INFO)
logger.addHandler(_fh)


class SessionCache:
    def __init__(self):
        self._guidelines: dict[tuple[str, ...], str] = {}
        self._components: dict[tuple[str, ...], str] = {}

    def get_guidelines(self, modules: list[str]) -> str:
        key = tuple(sorted(modules))
        if key not in self._guidelines:
            self._guidelines[key] = _get_guidelines_impl(modules)
        return self._guidelines[key]

    def get_components(self, names: list[str]) -> str:
        key = tuple(sorted(names))
        if key not in self._components:
            self._components[key] = _get_component_docs_impl(names)
        return self._components[key]


_session_cache = SessionCache()
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "8192"))


# ── Guidelines loader ──────────────────────────────────────────────────────

def _get_guidelines_impl(modules: list[str]) -> str:
    parts = []
    core = GUIDELINES_DIR / "core.md"
    if core.exists():
        parts.append(core.read_text())
    for module in modules:
        path = GUIDELINES_DIR / f"{module}.md"
        if path.exists():
            parts.append(path.read_text())
    return "\n\n---\n\n".join(parts)


def _get_component_docs_impl(names: list[str]) -> str:
    """Load component documentation for requested components."""
    available = []
    if COMPONENT_DOCS_DIR.exists():
        available = [p.stem for p in COMPONENT_DOCS_DIR.glob("*.md")]
    results = []
    for name in names:
        path = COMPONENT_DOCS_DIR / f"{name}.md"
        if path.exists():
            results.append(path.read_text())
        else:
            results.append(
                f"⚠️ 组件 {name} 文档不存在。可用: {', '.join(available) or '无'}"
            )
    return "\n---\n".join(results)


def get_guidelines(modules: list[str]) -> str:
    return _session_cache.get_guidelines(modules)


def get_component_docs(names: list[str]) -> str:
    return _session_cache.get_components(names)


# ── WidgetStreamProcessor (JSON DSL) ───────────────────────────────────────

class WidgetStreamProcessor:
    def __init__(self):
        self.last_parsed = None

    def process_delta(self, raw: str) -> dict | None:
        try:
            parsed = json.loads(raw)
            return self._emit(parsed)
        except json.JSONDecodeError:
            pass
        try:
            parsed = json_repair.loads(raw)
            if isinstance(parsed, dict):
                return self._emit(parsed)
        except Exception:
            pass
        return self._extract_completed(raw)

    def _emit(self, parsed: dict) -> dict | None:
        if parsed == self.last_parsed:
            return None
        self.last_parsed = parsed
        self._auto_fill_ids(parsed.get("children", []))
        return parsed

    def _auto_fill_ids(self, nodes: list, prefix: str = "auto") -> None:
        for i, node in enumerate(nodes):
            if isinstance(node, dict) and not node.get("id"):
                node["id"] = f"{prefix}-{node.get('component', 'node')}-{i}"
            if isinstance(node, dict) and "children" in node:
                self._auto_fill_ids(node["children"], f"{prefix}-{i}")

    def _extract_completed(self, raw: str) -> dict | None:
        """Fallback: try to extract completed top-level structure."""
        try:
            idx = raw.find('"children"')
            if idx == -1:
                return None
            rest = raw[idx + 9 :].lstrip()
            if not rest.startswith(":"):
                return None
            rest = rest[1:].lstrip()
            if not rest.startswith("["):
                return None
            parsed = json_repair.loads('{"version":1,"children":' + rest)
            if isinstance(parsed, dict) and "children" in parsed:
                return self._emit(parsed)
        except Exception:
            pass
        return None


# ── Partial string extractors ─────────────────────────────────────────────

def _walk_json_string_with_unicode(content: str, start: int) -> tuple[str | None, int]:
    """Walk a JSON string value, handling \\uXXXX and surrogate pairs. Returns (result, end_index)."""
    result = []
    i = start
    while i < len(content):
        c = content[i]
        if c == "\\" and i + 1 < len(content):
            n = content[i + 1]
            if n == "u" and i + 5 < len(content):
                hex_str = content[i + 2 : i + 6]
                try:
                    cp = int(hex_str, 16)
                    if 0xD800 <= cp <= 0xDBFF:
                        if i + 11 < len(content) and content[i + 6 : i + 8] == "\\u":
                            low = int(content[i + 8 : i + 12], 16)
                            if 0xDC00 <= low <= 0xDFFF:
                                result.append(chr(0x10000 + (cp - 0xD800) * 0x400 + (low - 0xDC00)))
                                i += 12
                                continue
                        return None, i
                    elif 0xDC00 <= cp <= 0xDFFF:
                        i += 6
                        continue
                    else:
                        result.append(chr(cp))
                        i += 6
                        continue
                except ValueError:
                    pass
            escapes = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", '"': '"', "/": "/", "b": "\b", "f": "\f"}
            result.append(escapes.get(n, n))
            i += 2
        elif c == '"':
            return "".join(result), i + 1
        else:
            result.append(c)
            i += 1
    return None, i


def extract_widget_code(partial_json: str) -> str | None:
    """Extract widget_code from partial JSON, with \\uXXXX handling."""
    try:
        data = json.loads(partial_json)
        return data.get("widget_code")
    except json.JSONDecodeError:
        pass
    key = '"widget_code"'
    idx = partial_json.find(key)
    if idx == -1:
        return None
    rest = partial_json[idx + len(key) :]
    colon = rest.find(":")
    if colon == -1:
        return None
    rest = rest[colon + 1 :].lstrip()
    if not rest.startswith('"'):
        return None
    content = rest[1:]
    val, _ = _walk_json_string_with_unicode(content, 0)
    return val


def extract_widget_config(partial_json: str) -> str | None:
    """Extract widget_config from partial JSON, with \\uXXXX handling."""
    try:
        data = json.loads(partial_json)
        return data.get("widget_config")
    except json.JSONDecodeError:
        pass
    key = '"widget_config"'
    idx = partial_json.find(key)
    if idx == -1:
        return None
    rest = partial_json[idx + len(key) :]
    colon = rest.find(":")
    if colon == -1:
        return None
    rest = rest[colon + 1 :].lstrip()
    if not rest.startswith('"'):
        return None
    content = rest[1:]
    val, _ = _walk_json_string_with_unicode(content, 0)
    return val


# ── SSE helper ─────────────────────────────────────────────────────────────

def sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ── Request schema ─────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str


class ChatBody(BaseModel):
    messages: list[Message]


# ── Main SSE endpoint ──────────────────────────────────────────────────────

def _write_chat_log(messages: list, last_widget: dict | None, timestamp: datetime) -> None:
    """Write chat log to log/chat_YYYYMMDD_HHMMSS.json."""
    payload = {
        "timestamp": timestamp.isoformat(),
        "messages": messages,
    }
    if last_widget:
        payload["last_widget"] = last_widget
    log_path = LOG_DIR / f"chat_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        logger.info("chat log written: %s", log_path.name)
    except OSError as e:
        logger.warning("failed to write chat log: %s", e)


@app.post("/chat")
async def chat(body: ChatBody):
    tools = get_tools()
    use_dsl = FEATURE_FLAGS.get("use_json_dsl", True)
    logger.info("chat request started, messages=%d, use_json_dsl=%s", len(body.messages), use_dsl)
    chat_start = datetime.now()
    last_widget: dict | None = None

    async def generate():
        nonlocal last_widget
        messages = [{"role": m.role, "content": m.content} for m in body.messages]

        while True:
            active_tool_calls: dict[int, dict] = {}
            current_text = ""
            dsl_processor = WidgetStreamProcessor() if use_dsl else None

            try:
                async with client.messages.stream(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    system=SYSTEM_PROMPT,
                    tools=tools,
                    messages=messages,
                ) as stream:

                    async for event in stream:

                        if event.type == "content_block_start":
                            block = event.content_block
                            if block.type == "tool_use":
                                active_tool_calls[event.index] = {
                                    "id": block.id,
                                    "name": block.name,
                                    "partial_json": "",
                                }

                        elif event.type == "content_block_delta":
                            delta = event.delta

                            if delta.type == "text_delta":
                                current_text += delta.text
                                yield sse({"type": "text", "text": delta.text})

                            elif delta.type == "input_json_delta":
                                tc = active_tool_calls.get(event.index)
                                if tc:
                                    tc["partial_json"] += delta.partial_json
                                    name = tc["name"]

                                    if name == "show_widget":
                                        if use_dsl:
                                            config_str = extract_widget_config(tc["partial_json"])
                                            if config_str and len(config_str) >= WIDGET_DELTA_THRESHOLD:
                                                parsed = dsl_processor.process_delta(config_str)
                                                if parsed:
                                                    yield sse({"type": "widget_delta", "parsed": parsed})
                                        else:
                                            html = extract_widget_code(tc["partial_json"])
                                            if html and len(html) > WIDGET_DELTA_THRESHOLD:
                                                yield sse({"type": "widget_delta", "html": html})

                    final_msg = await stream.get_final_message()

            except Exception as e:
                logger.exception("chat stream error: %s", e)
                if messages:
                    _write_chat_log(messages, last_widget, chat_start)
                yield sse({"type": "error", "text": str(e)})
                return

            assistant_content = []
            if current_text:
                assistant_content.append({"type": "text", "text": current_text})
            for block in final_msg.content:
                if block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })

            if final_msg.stop_reason != "tool_use":
                messages.append({"role": "assistant", "content": assistant_content})
                _write_chat_log(messages, last_widget, chat_start)
                yield sse({"type": "done"})
                break

            messages.append({"role": "assistant", "content": assistant_content})
            tool_results = []

            for block in final_msg.content:
                if block.type != "tool_use":
                    continue

                if block.name == "load_guidelines":
                    modules = block.input.get("modules", [])
                    logger.info("load_guidelines modules=%s", modules)
                    content = get_guidelines(modules)
                    yield sse({"type": "status", "text": f"Loading {', '.join(modules)} guidelines..."})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": content,
                    })

                elif block.name == "load_components":
                    names = block.input.get("names", [])
                    logger.info("load_components names=%s", names)
                    content = get_component_docs(names)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": content,
                    })

                elif block.name == "show_widget":
                    title = block.input.get("title", "widget").replace("_", " ")
                    mode = "json_dsl" if "widget_config" in block.input else "html"
                    logger.info("show_widget title=%s mode=%s", title, mode)
                    if "widget_config" in block.input:
                        config_str = block.input.get("widget_config", "")
                        last_widget = {"title": title, "config": config_str}
                        parsed = None
                        try:
                            parsed = json.loads(config_str)
                        except json.JSONDecodeError:
                            try:
                                parsed = json_repair.loads(config_str)
                            except Exception:
                                pass
                        if isinstance(parsed, dict):
                            WidgetStreamProcessor()._auto_fill_ids(parsed.get("children", []))
                            yield sse({"type": "widget_final", "mode": "json_dsl", "parsed": parsed, "title": title})
                        else:
                            yield sse({"type": "widget_final", "mode": "json_dsl", "parsed": {"version": 1, "children": []}, "title": title})
                    else:
                        html = block.input.get("widget_code", "")
                        last_widget = {"title": title, "html": html}
                        yield sse({"type": "widget_final", "mode": "html", "html": html, "title": title})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": f"Widget '{title}' rendered successfully.",
                    })

            messages.append({"role": "user", "content": tool_results})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Static files: prefer dist when built ───────────────────────────────────

_static_dir = Path(__file__).parent / "static"
_dist_dir = _static_dir / "dist"
if _dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="static")
else:
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
