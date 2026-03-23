import { Card, Progress } from "@arco-design/web-react";
import type { ComponentType } from "react";

interface BarChartProps {
  title?: string;
  data?: { label?: string; value?: number }[];
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

export const BarChart: ComponentType<BarChartProps> = ({ title, data = [] }) => {
  const items = data.slice(0, 20);
  const max = Math.max(...items.map((d) => (d.value ?? 0) as number), 1);

  return (
    <Card title={title} size="small" bordered>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 80, fontSize: 13 }}>{String(d.label ?? "")}</span>
            <Progress
              percent={((d.value ?? 0) as number) / max * 100}
              size="small"
              style={{ flex: 1 }}
              showText={false}
            />
            <span style={{ fontSize: 13, color: "var(--color-text-3)" }}>
              {String(d.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
