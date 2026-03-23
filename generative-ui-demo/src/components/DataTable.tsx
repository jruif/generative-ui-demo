import { Table, Tag, Progress } from "@arco-design/web-react";
import type { ComponentType } from "react";

interface ColumnDefConfig {
  title?: string;
  dataIndex?: string;
  align?: "left" | "center" | "right";
  render?: "tag" | "progress" | "link" | "image";
  renderConfig?: Record<string, unknown>;
  width?: number;
  sortable?: boolean;
  fixed?: "left" | "right";
}

interface DataTableProps {
  columns?: ColumnDefConfig[];
  data?: Record<string, unknown>[];
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

function cellRender(
  renderType: string | undefined,
  value: unknown,
  config?: Record<string, unknown>
) {
  if (!renderType) return String(value ?? "");
  switch (renderType) {
    case "tag":
      return <Tag>{String(value ?? "")}</Tag>;
    case "progress":
      const pct = Math.min(100, Math.max(0, Number(value) ?? 0));
      return <Progress percent={pct} size="small" />;
    case "link":
      const href = (config?.href as string) ?? "#";
      return (
        <a href={href} style={{ color: "rgb(var(--primary-6))" }}>
          {String(value ?? "")}
        </a>
      );
    case "image":
      return (
        <img
          src={String(value ?? "")}
          alt=""
          style={{ maxWidth: 48, maxHeight: 48, objectFit: "cover", borderRadius: 4 }}
        />
      );
    default:
      return String(value ?? "");
  }
}

export const DataTable: ComponentType<DataTableProps> = ({ columns = [], data = [] }) => {
  const cols = (columns.slice(0, 20) as ColumnDefConfig[]).map((c) => ({
    title: c.title ?? c.dataIndex,
    dataIndex: c.dataIndex,
    align: c.align,
    width: c.width,
    fixed: c.fixed,
    render: (_: unknown, record: Record<string, unknown>) => {
      const val = record[c.dataIndex ?? ""];
      return cellRender(c.render, val, c.renderConfig);
    },
  }));

  const rows = data.slice(0, 100) as Record<string, unknown>[];

  return (
    <Table
      columns={cols}
      data={rows}
      pagination={false}
      size="small"
      border={{ wrapper: true, cell: true }}
    />
  );
};
