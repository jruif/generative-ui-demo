import type { ReactNode } from "react";
import { sanitizeStyle } from "../sanitizeStyle";

interface BoxProps {
  style?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
}

export function Box({ style, className, children }: BoxProps) {
  const safeStyle = sanitizeStyle(style);
  return (
    <div style={safeStyle} className={className}>
      {children}
    </div>
  );
}
