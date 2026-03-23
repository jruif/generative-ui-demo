import { create } from "zustand";
import type { WidgetConfig } from "../types";

export type WidgetMode = "html" | "json_dsl";

interface WidgetState {
  hasWidget: boolean;
  widgetTitle: string;
  mode: WidgetMode;
  html: string;
  parsedConfig: Partial<WidgetConfig> | null;
  isStreaming: boolean;
  setHasWidget: (v: boolean) => void;
  setWidgetTitle: (v: string) => void;
  setMode: (v: WidgetMode) => void;
  setHtml: (v: string) => void;
  setParsedConfig: (v: Partial<WidgetConfig> | null) => void;
  setIsStreaming: (v: boolean) => void;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  hasWidget: false,
  widgetTitle: "",
  mode: "html",
  html: "",
  parsedConfig: null,
  isStreaming: false,
  setHasWidget: (v) => set({ hasWidget: v }),
  setWidgetTitle: (v) => set({ widgetTitle: v }),
  setMode: (v) => set({ mode: v }),
  setHtml: (v) => set({ html: v }),
  setParsedConfig: (v: Partial<WidgetConfig> | null) => set({ parsedConfig: v }),
  setIsStreaming: (v) => set({ isStreaming: v }),
}));
