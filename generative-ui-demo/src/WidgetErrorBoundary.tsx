import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Widget render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              padding: 24,
              background: "var(--color-surface)",
              border: "1px solid var(--color-danger)",
              borderRadius: 10,
              color: "var(--color-danger)",
              fontSize: 14,
            }}
          >
            组件渲染失败，请重试
          </div>
        )
      );
    }
    return this.props.children;
  }
}
