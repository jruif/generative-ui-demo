# BarChart

柱状图（基于 Arco Card + Progress），横向条形展示。

## Props

- `title` (string): 图表标题
- `data` (array): 数据项 `[{ label: string, value: number }]`

## 示例

```json
{
  "component": "BarChart",
  "props": {
    "title": "品类销售",
    "data": [
      { "label": "服装", "value": 3200 },
      { "label": "数码", "value": 2800 },
      { "label": "食品", "value": 1500 }
    ]
  }
}
```
