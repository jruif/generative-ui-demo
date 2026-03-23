export interface WidgetNode {
  id?: string;
  component: string;
  props?: Record<string, unknown>;
  style?: React.CSSProperties;
  className?: string;
  children?: (WidgetNode | string)[];
}

export interface WidgetConfig {
  version: number;
  children: WidgetNode[];
}
