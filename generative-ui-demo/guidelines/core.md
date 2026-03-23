# Core Design System

## JSON DSL (when using show_widget with widget_config)

Output format: `{ "version": 1, "children": [WidgetNode, ...] }`

WidgetNode: `{ "id"?, "component": string, "props"?, "style"?, "className"?, "children"?: (WidgetNode|string)[] }`

Layout primitives: Box, Flex, Grid, Stack, Sidebar, Split, Tabs, Collapse

Components: MetricCard, BarChart, LineChart, PieChart, DataTable, SearchForm, FormRenderer, StatusTag, RawHTML

**For configuration forms, filters, or data entry:** Use FormRenderer. Call `load_components(['FormRenderer'])` to get its props, field types, and visibleWhen examples before show_widget.

### Customization decision tree

1. Can it be done by adjusting props? (color, size, columns) → Pass props directly
2. Need to add other components beside/above/below? → Use Wrapper (Flex/Grid/Stack)
3. Need different behavior? (expandable row, stacked chart) → Check for variant component name
4. Need a form (config, filter, data entry)? → Use FormRenderer, load_components(['FormRenderer'])
5. Completely outside component library? → Use RawHTML fallback

### Tabs structure

```json
{"component":"Tabs","props":{"defaultTab":"cat","tabs":[{"label":"By Category","key":"cat","content":{...WidgetNode}}]}}
```

## HTML mode (when using show_widget with widget_code)

- HTML fragments only — no DOCTYPE, <html>, <head>, or <body>
- Streaming order: `<style>` → content HTML → `<script>`
- No comments — waste tokens during streaming
- Use ONLY CSS variables for colors

## CSS Variables

| Variable | Purpose |
|---|---|
| `--color-bg` | Page background |
| `--color-surface` | Card / panel background |
| `--color-surface-elevated` | Elevated panel |
| `--color-text` | Primary text |
| `--color-text-muted` | Secondary text |
| `--color-accent` | Purple highlight |
| `--color-accent-light` | Lighter purple |
| `--color-border` | Borders |
| `--color-success` | Green |
| `--color-warning` | Amber |
| `--color-danger` | Red |

## Two-Way Communication

`window.sendToAgent(data)` — sends JSON back to chat. Use for: filters, form submit, selections.
