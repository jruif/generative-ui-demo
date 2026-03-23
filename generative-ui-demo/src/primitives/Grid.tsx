import type { ReactNode } from "react";
import { sanitizeStyle } from "../sanitizeStyle";

interface GridProps {
  columns?: number | string;
  gap?: string | number;
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Grid({ columns = 1, gap, style, className, children }: GridProps) {
  const cols = typeof columns === "number" ? `repeat(${columns}, 1fr)` : columns;
  const safeStyle = sanitizeStyle({
    ...style,
    display: "grid",
    gridTemplateColumns: cols,
    gap: gap ?? 0,
  });
  return (
    <div style={safeStyle} className={className}>
      {Array.isArray(children) ? children.slice(0, 50) : children}
    </div>
  );
}
