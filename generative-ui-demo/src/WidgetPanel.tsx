import { useWidgetStore } from "./stores/widgetStore";
import { LegacyHtmlRenderer } from "./LegacyHtmlRenderer";
import { WidgetRenderer } from "./WidgetRenderer";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";

function EmptyState() {
  const quickSend = (text: string) => {
    const ev = new CustomEvent("quick-send", { detail: { text } });
    window.dispatchEvent(ev);
  };
  return (
    <div className="empty-state">
      <div className="empty-icon">⚡</div>
      <p>Ask for any visual — charts, calculators, diagrams, timers, dashboards, or games.</p>
      <div className="chips">
        <div className="chip" onClick={() => quickSend("compound interest calculator")}>
          Compound interest calculator
        </div>
        <div className="chip" onClick={() => quickSend("bar chart of monthly sales Jan-Jun")}>
          Sales bar chart
        </div>
        <div className="chip" onClick={() => quickSend("pomodoro timer")}>Pomodoro timer</div>
        <div className="chip" onClick={() => quickSend("flowchart of how HTTP requests work")}>
          HTTP flowchart
        </div>
        <div className="chip" onClick={() => quickSend("dashboard with 4 metric cards and a line chart")}>
          Dashboard
        </div>
      </div>
    </div>
  );
}

function WidgetToolbar({ title }: { title: string }) {
  return (
    <div className="widget-toolbar">
      <span className="widget-name">{title || "Widget"}</span>
      <div className="widget-status">
        <div className="status-dot" />
        <span className="status-label">Ready</span>
      </div>
    </div>
  );
}

export function WidgetPanel() {
  const { hasWidget, widgetTitle, mode } = useWidgetStore();

  return (
    <div className="widget-panel">
      <WidgetToolbar title={widgetTitle} />
      <div className="widget-root" role="region" aria-label="Widget content">
        {!hasWidget ? (
          <EmptyState />
        ) : (
          <WidgetErrorBoundary>
            {mode === "html" ? <LegacyHtmlRenderer /> : <WidgetRenderer />}
          </WidgetErrorBoundary>
        )}
      </div>
    </div>
  );
}
