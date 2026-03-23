import { useEffect, useRef } from "react";
import { useWidgetStore } from "./stores/widgetStore";

export function LegacyHtmlRenderer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptsRunRef = useRef(false);
  const html = useWidgetStore((s) => s.html);
  const isStreaming = useWidgetStore((s) => s.isStreaming);

  useEffect(() => {
    if (!containerRef.current || !html) return;
    containerRef.current.innerHTML = html;
    scriptsRunRef.current = false;
  }, [html]);

  useEffect(() => {
    if (!containerRef.current || !html || isStreaming) return;
    if (scriptsRunRef.current) return;
    scriptsRunRef.current = true;
    containerRef.current?.querySelectorAll("script").forEach((old) => {
      try {
        const s = document.createElement("script");
        if (old.src) s.src = old.src;
        else s.textContent = old.textContent;
        old.parentNode?.replaceChild(s, old);
      } catch (err) {
        console.warn("LegacyHtml script error:", err);
      }
    });
  }, [html, isStreaming]);

  if (!html) return null;
  return <div ref={containerRef} className="legacy-widget-root" />;
}
