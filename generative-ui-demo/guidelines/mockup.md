# Layout Primitives & Dashboards

## JSON DSL Layout Examples

**Stat grid (MetricCard):**
```json
{
  "component": "Grid",
  "props": { "columns": 3, "gap": "12px" },
  "children": [
    { "component": "MetricCard", "props": { "title": "Revenue", "value": "$48,200", "trend": "+12%" } },
    { "component": "MetricCard", "props": { "title": "Users", "value": "1,234", "trend": "+8%" } },
    { "component": "MetricCard", "props": { "title": "Orders", "value": "89", "trend": "-2%" } }
  ]
}
```

**Sidebar + content:**
```json
{
  "component": "Sidebar",
  "props": { "sideWidth": "280px" },
  "children": [
    { "component": "SearchForm", "props": { "fields": ["dateRange", "category"] } },
    {
      "component": "Stack",
      "props": { "gap": "20px" },
      "children": [
        { "component": "MetricCard", "props": { "title": "GMV", "value": "¥2.4M" } },
        { "component": "DataTable", "props": { "columns": [], "data": [] } }
      ]
    }
  ]
}
```

**Tabs:**
```json
{
  "component": "Tabs",
  "props": {
    "defaultTab": "table",
    "tabs": [
      { "label": "Table", "key": "table", "content": { "component": "DataTable", "props": {} } },
      { "label": "Chart", "key": "chart", "content": { "component": "BarChart", "props": {} } }
    ]
  }
}
```

## HTML mode (legacy)

For widget_code output, use Grid/Flex with CSS variables as in the original mockup examples.
