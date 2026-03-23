# MetricCard

指标卡片（基于 Arco Card），显示标题、数值和趋势。

## Props

- `title` (string): 指标标题
- `value` (string | number): 主数值
- `trend` (string): 趋势文本，如 "+15%"、"-2%"

## 示例

```json
{
  "component": "MetricCard",
  "props": {
    "title": "GMV",
    "value": "¥2.4M",
    "trend": "+15%"
  }
}
```
