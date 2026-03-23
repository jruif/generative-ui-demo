import type { ReactNode } from "react";
import { sanitizeStyle } from "../sanitizeStyle";

interface FlexProps {
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  gap?: string | number;
  align?: string;
  justify?: string;
  wrap?: boolean;
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Flex({ direction = "row", gap, align, justify, wrap, style, className, children }: FlexProps) {
  const safeStyle = sanitizeStyle({
    ...style,
    display: "flex",
    flexDirection: direction,
    gap: gap ?? 0,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? "wrap" : undefined,
  });
  return (
    <div style={safeStyle} className={className}>
      {Array.isArray(children) ? children.slice(0, 50) : children}
    </div>
  );
}
