import { Card, Tag } from "@arco-design/web-react";
import type { ComponentType } from "react";

const COLORS = ["arcoblue", "green", "orange", "red", "purple", "cyan"];

interface PieChartProps {
  title?: string;
  data?: { label?: string; value?: number }[];
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

export const PieChart: ComponentType<PieChartProps> = ({ title, data = [] }) => {
  const items = data.slice(0, 10);
  const total = items.reduce((s, d) => s + ((d.value ?? 0) as number), 0) || 1;

  return (
    <Card title={title} size="small" bordered>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Tag color={COLORS[i % COLORS.length]}>
              {String(d.label ?? "")}
            </Tag>
            <span style={{ flex: 1, fontSize: 13 }} />
            <span style={{ fontSize: 13, color: "var(--color-text-3)" }}>
              {Math.round(((d.value ?? 0) as number) / total * 100)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
