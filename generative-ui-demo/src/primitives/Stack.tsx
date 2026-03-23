import type { ReactNode } from "react";
import { sanitizeStyle } from "../sanitizeStyle";

interface StackProps {
  gap?: string | number;
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Stack({ gap = 8, style, className, children }: StackProps) {
  const safeStyle = sanitizeStyle({
    ...style,
    display: "flex",
    flexDirection: "column",
    gap: gap ?? 8,
  });
  return (
    <div style={safeStyle} className={className}>
      {Array.isArray(children) ? children.slice(0, 50) : children}
    </div>
  );
}
