import type { ReactNode } from "react";
import { sanitizeStyle } from "../sanitizeStyle";

interface SidebarProps {
  side?: "left" | "right";
  sideWidth?: string | number;
  gap?: string | number;
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Sidebar({ side = "left", sideWidth = "240px", gap = 16, style, className, children }: SidebarProps) {
  const kids = Array.isArray(children) ? children.slice(0, 2) : [children];
  const [sideChild, mainChild] = side === "left" ? kids : [kids[1], kids[0]];
  const safeStyle = sanitizeStyle({
    ...style,
    display: "flex",
    flexDirection: side === "left" ? "row" : "row-reverse",
    gap: gap ?? 16,
  });
  const sideStyle = sanitizeStyle({ flexShrink: 0, width: sideWidth, minWidth: sideWidth });
  return (
    <div style={safeStyle} className={className}>
      <div style={sideStyle}>{sideChild}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{mainChild}</div>
    </div>
  );
}
