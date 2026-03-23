# DataTable

数据表格（基于 Arco Table），支持预置列渲染器。

## Props

- `columns` (array): 列定义
  - `title` (string): 列标题
  - `dataIndex` (string): 数据字段名
  - `align` ("left" | "center" | "right"): 对齐方式
  - `width` (number): 列宽
  - `fixed` ("left" | "right"): 固定列
  - `render` ("tag" | "progress" | "link" | "image"): 预置渲染器
  - `renderConfig` (object): 渲染器配置，如 link 的 `href`
- `data` (array): 行数据对象数组

## 预置渲染器

- `tag`: 显示为 Tag 标签
- `progress`: 将数值显示为进度条（0–100）
- `link`: 显示为链接，可选 `renderConfig.href`
- `image`: 显示为缩略图

## 示例

```json
{
  "component": "DataTable",
  "props": {
    "columns": [
      { "title": "姓名", "dataIndex": "name" },
      { "title": "状态", "dataIndex": "status", "render": "tag" },
      { "title": "进度", "dataIndex": "progress", "render": "progress" },
      { "title": "金额", "dataIndex": "amount", "align": "right" }
    ],
    "data": [
      { "name": "张三", "status": "已完成", "progress": 80, "amount": 1200 },
      { "name": "李四", "status": "进行中", "progress": 45, "amount": 800 }
    ]
  }
}
```
