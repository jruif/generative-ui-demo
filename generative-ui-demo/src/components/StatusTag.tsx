import { Tag } from "@arco-design/web-react";
import type { ComponentType } from "react";

interface StatusTagProps {
  status?: string;
  color?: string;
  children?: React.ReactNode;
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

export const StatusTag: ComponentType<StatusTagProps> = ({ status, color, children }) => {
  return <Tag color={color}>{children ?? status}</Tag>;
};
