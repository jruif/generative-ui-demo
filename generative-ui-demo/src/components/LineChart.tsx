import { Card } from "@arco-design/web-react";
import type { ComponentType } from "react";

interface LineChartProps {
  title?: string;
  data?: { x?: string; y?: number }[];
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

export const LineChart: ComponentType<LineChartProps> = ({ title, data = [] }) => {
  const items = data.slice(0, 50);
  const values = items.map((d) => (d.y ?? 0) as number);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);

  return (
    <Card title={title} size="small" bordered>
      <div style={{ height: 120, display: "flex", alignItems: "flex-end", gap: 4 }}>
        {items.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${(((d.y ?? 0) as number) - min) / (max - min || 1) * 100}%`,
              minHeight: 2,
              background: "rgb(var(--primary-6))",
              borderRadius: "4px 4px 0 0",
            }}
            title={`${d.x ?? i}: ${d.y ?? 0}`}
          />
        ))}
      </div>
    </Card>
  );
};
