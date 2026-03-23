# FormRenderer

声明式表单（基于 Arco Form），支持 visibleWhen 条件可见。

## Props

- `fields` (array): 字段配置
  - `field` (string): 字段名
  - `label` (string): 标签
  - `type`: input | textarea | password | number | select | radio | checkbox | switch | date
  - `options` (array): 选项，select/radio 用 `[{label, value}]` 或 `["A","B"]`
  - `placeholder` (string): 占位符
  - `required` (boolean): 必填
  - `visibleWhen`: `{ field: string, value: any | any[] }` 当依赖字段等于 value 时显示

## 示例

```json
{
  "component": "FormRenderer",
  "props": {
    "fields": [
      {
        "field": "type",
        "label": "类型",
        "type": "select",
        "options": [
          { "label": "A", "value": "A" },
          { "label": "B", "value": "B" }
        ]
      },
      {
        "field": "detailA",
        "label": "详情A",
        "type": "input",
        "visibleWhen": { "field": "type", "value": "A" }
      },
      {
        "field": "detailB",
        "label": "详情B",
        "type": "textarea",
        "visibleWhen": { "field": "type", "value": "B" }
      },
      { "field": "count", "label": "数量", "type": "number" },
      { "field": "active", "label": "启用", "type": "switch" }
    ]
  }
}
```
