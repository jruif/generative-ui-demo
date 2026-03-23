import { memo, useEffect, useState } from "react";
import { getComponent, PRIMITIVES } from "./registry";
import { sanitizeStyle } from "./sanitizeStyle";
import { RawHTMLComponent } from "./RawHTMLComponent";
import type { WidgetNode } from "./types";

const MAX_DEPTH = 15;

export interface RenderNodeProps {
  node: WidgetNode | string;
  index: number;
  depth: number;
  isStreaming?: boolean;
}

export const RenderNode = memo(
  function RenderNode({ node, depth, isStreaming = false }: RenderNodeProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
      const raf = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(raf);
    }, []);

    if (depth > MAX_DEPTH) {
      return <div className="text-red-400 text-sm">渲染深度超过限制</div>;
    }

    if (typeof node === "string") return <>{node}</>;

    const { component, props = {}, style, className, children } = node;

    if (component === "RawHTML") {
      return (
        <div className={isMounted ? "" : "animate-fade-in"}>
          <RawHTMLComponent html={(props.html as string) || ""} />
        </div>
      );
    }

    const Primitive = PRIMITIVES[component];
    const Component = Primitive ?? getComponent(component);

    if (!Component) {
      return (
        <div className="border border-dashed border-yellow-500 p-3 rounded text-sm text-yellow-400">
          未注册组件: {component}
        </div>
      );
    }

    const safeStyle = style ? sanitizeStyle(style as Record<string, unknown>) : undefined;
    const baseProps: Record<string, unknown> = typeof props === "object" && props != null ? (props as Record<string, unknown>) : {};
    const finalProps: Record<string, unknown> = {
      ...baseProps,
      style: safeStyle,
      className,
    };
    if (!Primitive) {
      finalProps.onAction = isStreaming ? undefined : (data: unknown) => {
        const payload: Record<string, unknown> = { component };
        if (typeof data === "object" && data != null) {
          Object.assign(payload, data);
        }
        window.sendToAgent?.(payload);
      };
      finalProps.disabled = isStreaming;
    }

    let renderedChildren: React.ReactNode = children?.map((child, i) =>
      typeof child === "string" ? (
        child
      ) : (
        <RenderNode
          key={(child as WidgetNode).id ?? `${(child as WidgetNode).component}-${i}`}
          node={child as WidgetNode}
          index={i}
          depth={depth + 1}
          isStreaming={isStreaming}
        />
      )
    );

    if (component === "Tabs" && props.tabs) {
      const tabs = Array.isArray(props.tabs) ? props.tabs : [];
      renderedChildren = undefined;
      (finalProps as Record<string, unknown>).tabs = tabs.map((t: { label?: string; key?: string; content?: WidgetNode }) => ({
        label: t.label,
        key: t.key,
        content: t.content ? (
          <RenderNode node={t.content} index={0} depth={depth + 1} isStreaming={isStreaming} />
        ) : null,
      }));
    }

    return (
      <div className={isMounted ? "" : "animate-fade-in"}>
        <Component {...finalProps}>{renderedChildren}</Component>
      </div>
    );
  },
  (prev, next) => prev.node === next.node && prev.isStreaming === next.isStreaming
);
