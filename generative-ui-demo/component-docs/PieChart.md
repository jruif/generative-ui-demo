# PieChart

饼图图例（基于 Arco Card + Tag），展示占比分布。

## Props

- `title` (string): 图表标题
- `data` (array): 数据项 `[{ label: string, value: number }]`

## 示例

```json
{
  "component": "PieChart",
  "props": {
    "title": "品类占比",
    "data": [
      { "label": "服装", "value": 35 },
      { "label": "数码", "value": 28 },
      { "label": "食品", "value": 22 },
      { "label": "其他", "value": 15 }
    ]
  }
}
```
