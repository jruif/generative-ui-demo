import type { ComponentType } from "react";
import { RawHTMLComponent } from "./RawHTMLComponent";
import * as primitives from "./primitives";
import * as components from "./components";

const PRIMITIVES: Record<string, ComponentType<Record<string, unknown>>> = {
  Box: primitives.Box,
  Flex: primitives.Flex,
  Grid: primitives.Grid,
  Stack: primitives.Stack,
  Sidebar: primitives.Sidebar,
  Split: primitives.Split,
  Tabs: primitives.Tabs,
  Collapse: primitives.Collapse,
};

const COMPONENT_REGISTRY: Record<string, ComponentType<Record<string, unknown>>> = {
  ...PRIMITIVES,
  RawHTML: RawHTMLComponent,
  MetricCard: components.MetricCard,
  DataTable: components.DataTable,
  BarChart: components.BarChart,
  LineChart: components.LineChart,
  PieChart: components.PieChart,
  SearchForm: components.SearchForm,
  FormRenderer: components.FormRenderer,
  StatusTag: components.StatusTag,
};

export function getComponent(name: string): ComponentType<Record<string, unknown>> | null {
  return COMPONENT_REGISTRY[name] ?? null;
}

export function registerComponent(name: string, component: ComponentType<Record<string, unknown>>) {
  COMPONENT_REGISTRY[name] = component;
}

export { PRIMITIVES };
