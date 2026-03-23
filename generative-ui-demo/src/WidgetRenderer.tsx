import { useEffect, useState } from "react";
import type { WidgetConfig } from "./types";
import { useWidgetStore } from "./stores/widgetStore";
import { RenderNode } from "./RenderNode";
import { StreamingSkeleton } from "./StreamingSkeleton";

export function WidgetRenderer() {
  const { parsedConfig, isStreaming: storeStreaming, setHasWidget, setWidgetTitle } = useWidgetStore();
  const [config, setConfig] = useState<Partial<WidgetConfig> | null>(parsedConfig);
  const [isStreaming, setIsStreaming] = useState(storeStreaming);

  useEffect(() => {
    if (parsedConfig?.children?.length) setConfig(parsedConfig);
    setIsStreaming(storeStreaming);
  }, [parsedConfig, storeStreaming]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { type, parsed, title } = (e as CustomEvent).detail ?? {};
      if (type === "widget_delta") {
        setIsStreaming(true);
        setHasWidget(true);
        if (parsed) setConfig(parsed);
      }
      if (type === "widget_final") {
        setIsStreaming(false);
        if (parsed) setConfig(parsed);
        if (title) setWidgetTitle(title);
      }
    };
    window.addEventListener("widget-event", handler as EventListener);
    return () => window.removeEventListener("widget-event", handler as EventListener);
  }, [setHasWidget, setWidgetTitle]);

  if (!config?.children?.length) return null;

  return (
    <div className="widget-renderer">
      {config.children.map((node, i) => (
        <RenderNode
          node={node}
          index={i}
          depth={0}
          key={node.id ?? `${node.component}-${i}`}
          isStreaming={isStreaming}
        />
      ))}
      {isStreaming && <StreamingSkeleton />}
    </div>
  );
}
