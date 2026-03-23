import type { ReactNode } from "react";
import { sanitizeStyle } from "../sanitizeStyle";

interface SplitProps {
  ratio?: string;
  gap?: string | number;
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Split({ ratio = "1:1", gap = 16, style, className, children }: SplitProps) {
  const parts = ratio.split(":").map((n) => parseInt(n, 10) || 1);
  const kids = Array.isArray(children) ? children.slice(0, parts.length) : [];
  const safeStyle = sanitizeStyle({
    ...style,
    display: "flex",
    gap: gap ?? 16,
  });
  return (
    <div style={safeStyle} className={className}>
      {kids.map((child, i) => (
        <div key={i} style={{ flex: parts[i] ?? 1, minWidth: 0 }}>
          {child}
        </div>
      ))}
    </div>
  );
}
