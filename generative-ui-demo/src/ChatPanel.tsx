import { useCallback, useEffect, useRef, useState } from "react";
import type { WidgetConfig } from "./types";
import { useWidgetStore } from "./stores/widgetStore";

interface Message {
  role: "user" | "assistant";
  text: string;
  isStatus?: boolean;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const MAX_HISTORY = 40;
  const htmlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHtmlRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    setHasWidget,
    setWidgetTitle,
    setMode,
    setHtml,
    setParsedConfig,
    setIsStreaming,
  } = useWidgetStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, assistantText, scrollToBottom]);
  useEffect(() => {
    return () => {
      if (htmlDebounceRef.current) clearTimeout(htmlDebounceRef.current);
    };
  }, []);

  const dispatchWidgetEvent = useCallback((detail: Record<string, unknown>) => {
    window.dispatchEvent(new CustomEvent("widget-event", { detail }));
  }, []);

  const scheduleHtmlUpdate = useCallback(
    (html: string) => {
      pendingHtmlRef.current = html;
      if (htmlDebounceRef.current) return;
      htmlDebounceRef.current = setTimeout(() => {
        htmlDebounceRef.current = null;
        if (pendingHtmlRef.current) {
          setHtml(pendingHtmlRef.current);
          setHasWidget(true);
          setMode("html");
        }
      }, 50);
    },
    [setHtml, setHasWidget, setMode]
  );

  const doSend = useCallback(
    async (overrideText?: string | null) => {
      if (streaming) return;

      let text: string;
      if (overrideText !== null) {
        text = overrideText ?? input.trim();
        if (!text) return;
        setMessages((m) => [...m, { role: "user", text }]);
        historyRef.current.push({ role: "user", content: text });
        setInput("");
      } else {
        text = "";
      }

      setStreaming(true);
      let currentText = "";
      let skeletonShown = false;

      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => controller.abort(), 60000);

      try {
        const resp = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historyRef.current.slice(-MAX_HISTORY),
          }),
          signal: controller.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;

        if (!resp.ok) {
          const msg = await resp.text().catch(() => `HTTP ${resp.status}`);
          throw new Error(msg || `Server error ${resp.status}`);
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            let ev: Record<string, unknown>;
            try {
              ev = JSON.parse(part.slice(6));
            } catch {
              continue;
            }

            switch (ev.type) {
              case "text":
                currentText += (ev.text as string) ?? "";
                setAssistantText(currentText);
                break;

              case "status":
                setMessages((m) => [...m, { role: "assistant", text: ev.text as string, isStatus: true }]);
                if (!skeletonShown) {
                  setHasWidget(true);
                  skeletonShown = true;
                }
                break;

              case "widget_delta":
                setHasWidget(true);
                setIsStreaming(true);
                if ("parsed" in ev && ev.parsed) {
                  setMode("json_dsl");
                  setParsedConfig(ev.parsed as Partial<WidgetConfig>);
                  dispatchWidgetEvent({ type: "widget_delta", parsed: ev.parsed });
                }
                if ("html" in ev && ev.html) {
                  scheduleHtmlUpdate(ev.html as string);
                }
                break;

              case "widget_final":
                if (htmlDebounceRef.current) {
                  clearTimeout(htmlDebounceRef.current);
                  htmlDebounceRef.current = null;
                }
                const mode = (ev.mode as "html" | "json_dsl") ?? "html";
                const title = (ev.title as string) ?? "Widget";
                setHasWidget(true);
                setIsStreaming(false);
                setMode(mode);
                setWidgetTitle(title);
                if (mode === "html" && ev.html) {
                  setHtml(ev.html as string);
                }
                if (mode === "json_dsl" && ev.parsed) {
                  setParsedConfig(ev.parsed as Partial<WidgetConfig>);
                }
                dispatchWidgetEvent({
                  type: "widget_final",
                  mode,
                  parsed: ev.parsed,
                  html: ev.html,
                  title,
                });
                break;

              case "error":
                setMessages((m) => [...m, { role: "assistant", text: `Error: ${ev.text}`, isStatus: false }]);
                break;

              case "done":
                if (currentText) {
                  historyRef.current.push({ role: "assistant", content: currentText });
                  setMessages((prev) => [...prev, { role: "assistant", text: currentText }]);
                }
                break;
            }
          }
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : String(err);
        if ((err as Error & { name?: string })?.name !== "AbortError") {
          setMessages((m) => [...m, { role: "assistant", text: `Connection error: ${msg}`, isStatus: false }]);
        }
      } finally {
        setStreaming(false);
        setIsStreaming(false);
        setAssistantText("");
        abortControllerRef.current = null;
        if (htmlDebounceRef.current) {
          clearTimeout(htmlDebounceRef.current);
          htmlDebounceRef.current = null;
        }
      }
    },
    [
      streaming,
      input,
      messages.length,
      dispatchWidgetEvent,
      scheduleHtmlUpdate,
      setHasWidget,
      setMode,
      setWidgetTitle,
      setHtml,
      setParsedConfig,
      setIsStreaming,
    ]
  );

  const sendToAgentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    window.sendToAgent = (data: unknown) => {
      const text = `[Widget interaction] ${JSON.stringify(data)}`;
      historyRef.current.push({ role: "user", content: text });
      setMessages((m) => [...m, { role: "user", text }]);
      if (sendToAgentDebounceRef.current) clearTimeout(sendToAgentDebounceRef.current);
      sendToAgentDebounceRef.current = setTimeout(() => {
        sendToAgentDebounceRef.current = null;
        doSend(null);
      }, 500);
    };
    return () => {
      if (sendToAgentDebounceRef.current) clearTimeout(sendToAgentDebounceRef.current);
      delete window.sendToAgent;
    };
  }, [doSend]);

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      if (text) doSend(text);
    };
    window.addEventListener("quick-send", handler);
    return () => window.removeEventListener("quick-send", handler);
  }, [doSend]);

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="logo">✦</div>
        <h1>Generative UI</h1>
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            <div className={`bubble ${msg.role} ${msg.isStatus ? "status-msg" : ""}`}>{msg.text}</div>
          </div>
        ))}
        {streaming && assistantText === "" && (
          <div className="msg-row assistant">
            <div className="typing">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          </div>
        )}
        {streaming && assistantText && (
          <div className="msg-row assistant">
            <div className="bubble assistant">{assistantText}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-box">
          <textarea
            className="user-input"
            rows={1}
            placeholder="Ask for a chart, calculator, diagram..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                doSend(undefined);
              }
            }}
            disabled={streaming}
          />
          <button
            className="send-btn"
            title="Send (Enter)"
            disabled={streaming || !input.trim()}
            onClick={() => doSend(undefined)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
        <p className="hint">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
