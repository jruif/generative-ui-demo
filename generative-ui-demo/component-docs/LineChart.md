# LineChart

折线图（基于 Arco Card），柱形高度表示数值趋势。

## Props

- `title` (string): 图表标题
- `data` (array): 数据项 `[{ x: string, y: number }]`

## 示例

```json
{
  "component": "LineChart",
  "props": {
    "title": "GMV 趋势",
    "data": [
      { "x": "1月", "y": 120 },
      { "x": "2月", "y": 150 },
      { "x": "3月", "y": 110 },
      { "x": "4月", "y": 180 }
    ]
  }
}
```
