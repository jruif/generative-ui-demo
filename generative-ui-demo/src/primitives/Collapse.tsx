import { useState } from "react";
import type { ReactNode } from "react";

interface CollapseProps {
  title?: string;
  defaultOpen?: boolean;
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Collapse({ title = "", defaultOpen = false, style, className, children }: CollapseProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className} style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden", ...style }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "none",
          background: "var(--color-surface)",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {title}
        <span>{open ? "▼" : "▶"}</span>
      </button>
      {open && <div style={{ padding: 16, borderTop: "1px solid var(--color-border)" }}>{children}</div>}
    </div>
  );
}
