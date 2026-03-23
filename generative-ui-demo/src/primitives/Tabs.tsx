import { useState } from "react";
import type { ReactNode } from "react";

interface TabItem {
  label?: string;
  key?: string;
  content?: ReactNode;
}

interface TabsProps {
  defaultTab?: string;
  tabs?: TabItem[];
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Tabs({ defaultTab, tabs = [], style, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key ?? "");
  const items = tabs.slice(0, 20);
  const activeItem = items.find((t) => t.key === active) ?? items[0];

  return (
    <div className={className} style={style}>
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-border)", marginBottom: 12 }}>
        {items.map((t) => (
          <button
            key={t.key ?? t.label}
            type="button"
            onClick={() => setActive(t.key ?? "")}
            style={{
              padding: "8px 16px",
              border: "none",
              background: active === t.key ? "var(--color-accent-light)" : "transparent",
              color: active === t.key ? "#fff" : "var(--color-text)",
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            {t.label ?? t.key}
          </button>
        ))}
      </div>
      {activeItem?.content}
    </div>
  );
}
