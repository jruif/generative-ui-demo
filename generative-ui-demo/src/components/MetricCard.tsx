import { Card } from "@arco-design/web-react";
import type { ComponentType } from "react";

interface MetricCardProps {
  title?: string;
  value?: string | number;
  trend?: string;
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

export const MetricCard: ComponentType<MetricCardProps> = ({ title, value, trend }) => {
  const trendColor =
    trend?.startsWith("+")
      ? "var(--color-success)"
      : trend?.startsWith("-")
        ? "var(--color-danger)"
        : "var(--color-text-muted)";

  return (
    <Card size="small" bordered>
      {title && (
        <div style={{ fontSize: 13, color: "var(--color-text-3)", marginBottom: 4 }}>{title}</div>
      )}
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      {trend && (
        <div style={{ fontSize: 12, marginTop: 4, color: trendColor }}>{trend}</div>
      )}
    </Card>
  );
};
