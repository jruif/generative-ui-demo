import { useEffect, useRef } from "react";

interface RawHTMLProps {
  html?: string;
  [key: string]: unknown;
}

export function RawHTMLComponent({ html }: RawHTMLProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><base target="_blank">
<style>:root{--color-bg:#f4f4f5;--color-surface:#fff;--color-text:#18181b;--color-text-muted:#71717a;--color-accent:#7c3aed;--color-border:rgba(0,0,0,.09);}</style></head><body>${html}</body></html>`
    );
    doc.close();
    doc.body?.querySelectorAll("script").forEach((old) => {
      try {
        const s = doc.createElement("script");
        if (old.src) s.src = old.src;
        else s.textContent = old.textContent;
        old.parentNode?.replaceChild(s, old);
      } catch (err) {
        console.warn("RawHTML script error:", err);
      }
    });
    const win = iframeRef.current.contentWindow as Window & { sendToAgent?: typeof window.sendToAgent };
    if (win) {
      win.sendToAgent = (data: unknown) => window.sendToAgent?.(data);
    }
  }, [html]);

  if (!html) return null;
  return (
    <iframe
      ref={iframeRef}
      className="raw-html-widget"
      sandbox="allow-scripts allow-same-origin"
      title="Widget"
      style={{ width: "100%", minHeight: 600, height: "100%", border: "1px solid var(--color-border)", borderRadius: 8 }}
    />
  );
}
