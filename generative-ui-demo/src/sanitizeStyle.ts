import type { CSSProperties } from "react";

/**
 * Style sanitization: key whitelist + value safety to prevent CSS injection.
 */

const ALLOWED_KEYS = new Set([
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "gap",
  "flex",
  "flexDirection",
  "flexWrap",
  "alignItems",
  "alignSelf",
  "justifyContent",
  "justifySelf",
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "overflow",
  "overflowX",
  "overflowY",
  "border",
  "borderRadius",
  "backgroundColor",
  "color",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "textAlign",
  "opacity",
  "transform",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
]);

function isSafeValue(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase().replace(/\s/g, "");
  return (
    !lower.includes("url(") &&
    !lower.includes("expression(") &&
    !lower.includes("javascript:") &&
    !lower.includes("import(")
  );
}

export function sanitizeStyle(style: Record<string, unknown> | undefined): CSSProperties {
  if (!style || typeof style !== "object") return {};
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(style)) {
    const camel = key.startsWith("--") ? key : key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!ALLOWED_KEYS.has(camel) && !camel.startsWith("--")) continue;
    if (value == null) continue;
    if (!isSafeValue(value)) continue;
    result[key] = value as string | number;
  }
  return result as CSSProperties;
}
