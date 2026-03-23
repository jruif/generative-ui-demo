# Generative UI 技术方案

**基于 JSON DSL + React 组件化流式渲染架构**

_从原生 HTML 流式生成到组件化 DSL 架构的完整演进_

> 版本: v1.3 | 日期: 2026-03-20 | 状态: 可行性评审通过版

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [现有架构分析与代码 Review](#2-现有架构分析与代码-review)
3. [核心改造：JSON DSL + React 渲染](#3-核心改造json-dsl--react-渲染)
4. [前端工程化设计](#4-前端工程化设计)
5. [组件复用体系与 Arco 集成](#5-组件复用体系与-arco-集成)
6. [布局灵活性架构](#6-布局灵活性架构)
7. [定制能力模型](#7-定制能力模型)
8. [流式渲染管线](#8-流式渲染管线)
9. [服务端改造](#9-服务端改造)
10. [Guidelines 迁移与工具职责划分](#10-guidelines-迁移与工具职责划分)
11. [渐进式迁移方案](#11-渐进式迁移方案)
12. [完整示例：复杂 Dashboard](#12-完整示例复杂-dashboard)
13. [架构全面对比](#13-架构全面对比)
14. [实施路线](#14-实施路线)
15. [项目文件结构](#15-项目文件结构)
16. [风险与缓解](#16-风险与缓解)

---

## 1. 执行摘要

Generative UI 是一种让 AI 实时生成交互式用户界面的架构模式。本方案在 Anthropic 官方 generative-ui-demo 基础上，针对企业级应用场景提出三大核心改造：

1. **渲染层转型：** 从 HTML + morphdom 过渡到 JSON DSL + React reconciliation，让 AI 生成组件描述而非原生 HTML。
2. **组件复用体系：** 通过组件注册表 + 按需加载，直接使用已有基于 Arco Design 封装的业务组件，节省 70-80% 输出 token。
3. **布局灵活性：** 可嵌套布局原语体系（Flex/Grid/Sidebar/Split）+ style 直通 + RawHTML 兜底，三层渐进灵活度。

> **核心价值：** Claude 的输出变"薄"（只描述用什么组件、传什么数据），前端变"厚"（真正的渲染、交互、样式都在业务组件里）。既节省 token，又保证组件质量和一致性。

### 体验模式的变化

本方案带来一个需要团队认知对齐的体验转变：

- **现有方案（HTML 流式）：** 像素级渐进——card 边框先出现，然后标题，然后数值，"正在画"的感觉
- **新方案（JSON DSL）：** 组件级渐进——skeleton 占位 → 完整组件弹出 → 下一个 skeleton → 又弹一个，"逐个加载"的感觉

后者实际延迟更短，但视觉感受不同。这是产品决策，不是技术缺陷。

---

## 2. 现有架构分析与代码 Review

### 2.1 架构概览

现有方案采用三层架构、六个文件、~800 行代码，通过七个机制实现完整体验：

| 机制           | 作用                  | 实现方式                             |
| -------------- | --------------------- | ------------------------------------ |
| 结构化工具调用 | 分离文本与 UI 片段    | show_widget 工具将 HTML 放入独立通道 |
| 部分 JSON 解析 | 实时预览未完成 widget | extract_widget_code 手写解析器       |
| Morphdom       | 无闪烁增量渲染        | 只更新变化节点，新节点淡入           |
| 脚本节点替换   | 安全执行 JavaScript   | createElement('script') 替换方式     |
| CSS 变量       | 自动主题继承          | :root 定义 token，组件引用变量       |
| 懒加载指南     | 按需注入设计知识      | load_guidelines 工具                 |
| sendToAgent    | 双向交互循环          | 全局函数发送交互数据                 |

### 2.2 现有技术栈

- `static/index.html` 通过 CDN 引入 React、morphdom，已预加载 Arco Design
- 无 `package.json`，无构建流程，FastAPI 直接托管 `static/` 目录
- Guidelines 面向 HTML 输出（form.md 教 Claude 用 Arco 写 createElement）

### 2.3 代码 Review 发现的问题

#### 2.3.1 server.py

| 问题                                   | 严重度 | 说明                                                     |
| -------------------------------------- | ------ | -------------------------------------------------------- |
| `extract_widget_code` 无 `\uXXXX` 处理 | 🔴 P0  | 中文输出乱码 `u4f60u597d` 而非 `你好`                    |
| 异常处理不包裹 `async with`            | 🔴 P0  | API key 无效/rate limit 时前端无错误提示，SSE 流断裂     |
| 无并发请求保护                         | 🟠 P1  | 用户快速操作时两个 generate() 协程同时运行，SSE 数据交叉 |
| widget_delta 阈值过低 (15)             | 🟡 P2  | `<style>\n.calc {` 就会触发无意义渲染                    |
| model 硬编码 `claude-opus-4-6`         | 🟡 P2  | 无法通过配置切换模型                                     |
| `max_tokens=8096` 可能笔误             | 🟡 P2  | 应为 8192                                                |

#### 2.3.2 tools.py

| 问题                                        | 严重度 | 说明                                                  |
| ------------------------------------------- | ------ | ----------------------------------------------------- |
| `load_guidelines` enum 可能缺少 `form` 模块 | 🟡 P2  | 如果 form.md 存在但 enum 未列出，表单场景无法加载指南 |
| `i_have_seen_guidelines` 无服务端校验       | 🟡 P2  | Claude 可直接设 true 跳过 guidelines 加载             |

#### 2.3.3 system.py

| 问题                        | 严重度 | 说明                                 |
| --------------------------- | ------ | ------------------------------------ |
| CSS 变量列表与 core.md 重复 | 🟡 P2  | 每次请求浪费 ~200 token              |
| 缺少非可视化请求指导        | 🟡 P2  | 边界场景 Claude 可能不确定是否调工具 |

#### 2.3.4 index.html

| 问题                      | 严重度 | 说明                                |
| ------------------------- | ------ | ----------------------------------- |
| SSE 读取无超时            | 🟠 P1  | Claude API 无响应时前端永久 loading |
| `sendToAgent` 无防抖      | 🟠 P1  | oninput 触发请求风暴                |
| `doSend` 无 abort 机制    | 🟠 P1  | 并发请求无法取消                    |
| `runScripts` 无 try-catch | 🟡 P2  | 脚本错误中断后续逻辑                |
| history 无限增长          | 🟡 P2  | token 线性增长                      |

#### 2.3.5 Guidelines

| 问题                                                 | 严重度      | 说明                                     |
| ---------------------------------------------------- | ----------- | ---------------------------------------- |
| core.md 禁止注释，但 chart.md 示例中有注释           | 🟡 P2       | Claude 可能跟随示例在 widget 中加注释    |
| diagram.md SVG 用 presentation attributes 硬编码颜色 | 🟡 P2       | 应改为 inline style 支持 CSS 变量        |
| chart.md 硬编码 hex 颜色                             | ⚪ 已知限制 | Chart.js 不支持 CSS 变量，需在文档中注明 |

---

## 3. 核心改造：JSON DSL + React 渲染

### 3.1 数据流架构

```
Claude 流式输出 JSON DSL
    ↓
Server: 提取 widget_config string + partial JSON 解析（Python 端）
    ↓
SSE widget_delta: { parsed: {...} }（结构化数据，非 raw string）
    ↓
前端 React: 直接 setState(parsed) → React reconciliation → 业务组件渲染
```

> **关键决策变更（v1.3）：** 采用"服务端解析 + 前端纯 CSR"模式。服务端用 Python 的 `json-repair` 库做 partial JSON 解析，前端收到的是已结构化的干净数据，无需 `partial-json` 前端库。

### 3.2 JSON DSL 协议设计

```typescript
interface WidgetNode {
  id?: string; // 稳定唯一标识，用于 React key
  component: string; // 组件名或布局原语名
  props?: Record<string, any>; // 组件 props
  style?: React.CSSProperties; // CSS 样式（白名单过滤）
  className?: string; // Tailwind/Arco class
  children?: (WidgetNode | string)[];
}

interface WidgetConfig {
  version: number; // 协议版本号，当前为 1
  children: WidgetNode[];
}
```

> **设计决策：**
>
> 1. `widget_config` 仍为 string 类型（内部 JSON 字符串），复用现有 partial string 提取逻辑。
> 2. WidgetNode 应携带 `id` 字段用于 React 稳定 key。服务端对缺失 id 的节点自动补全。
> 3. 顶层 `version` 字段用于未来协议升级的兼容。

### 3.3 Tabs 组件的显式 slot 映射

Tabs 采用显式映射，每个 tab 的 `content` 字段直接包含其内容节点：

```json
{
  "component": "Tabs",
  "id": "data-tabs",
  "props": {
    "defaultTab": "category",
    "tabs": [
      {
        "label": "按品类", "key": "category",
        "content": { "component": "DataTable", "id": "table-cat", "props": {...} }
      }
    ]
  }
}
```

### 3.4 Token 效率对比

| 方式                            | Prompt Token       | 输出 Token      | 总体成本 |
| ------------------------------- | ------------------ | --------------- | -------- |
| 全量组件文档塞 Prompt           | 3000-8000          | 较少            | 高       |
| 注册表 + 按需加载               | 100-200 + 按需     | 较少            | 低       |
| Claude 从零生成 HTML            | 0                  | 大量浪费        | 高       |
| **JSON DSL + 业务组件（推荐）** | **100-200 + 按需** | **减少 70-80%** | **最低** |

---

## 4. 前端工程化设计

### 4.1 技术选型：Vite + React + Arco + TypeScript

```bash
npm init -y
npm install react react-dom @arco-design/web-react
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
```

### 4.2 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "src",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@primitives": path.resolve(__dirname, "src/primitives"),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: { "arcoblue-6": "#7c3aed" },
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: "../static/dist",
    emptyOutDir: true,
  },
  server: {
    proxy: { "/chat": "http://localhost:8000" },
  },
});
```

### 4.3 与 FastAPI 对接

```python
# server.py
import os
if os.path.exists("static/dist"):
    app.mount("/", StaticFiles(directory="static/dist", html=True), name="static")
else:
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

### 4.4 宿主页面与挂载关系

```tsx
// src/WidgetPanel.tsx
export function WidgetPanel() {
  const { hasWidget, widgetTitle, mode } = useWidgetStore();
  return (
    <div className="widget-panel">
      <WidgetToolbar title={widgetTitle} />
      {!hasWidget ? (
        <EmptyState />
      ) : mode === "html" ? (
        <LegacyHtmlRenderer />
      ) : (
        <WidgetRenderer />
      )}
    </div>
  );
}
```

**挂载关系：** App → ChatPanel + WidgetPanel。WidgetPanel 内部通过 `hasWidget` 控制空状态与渲染器互斥切换；通过 `mode` 控制双模式路由（迁移期）。

---

## 5. 组件复用体系与 Arco 集成

### 5.1 Arco Design 的定位

Arco 作为**基础 UI 层**，Claude **不直接使用** Arco 组件，**只使用**注册表中的业务组件名：

```
Arco Design（基础 UI 库）→ 封装 → 业务组件 → 注册 → 组件注册表 → Claude 通过 JSON DSL 引用
```

### 5.2 组件注册中心

```typescript
// src/registry.ts
const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  MetricCard,
  BarChart,
  LineChart,
  PieChart,
  DataTable,
  SearchForm,
  FormRenderer,
  StatusTag,
  StepFlow,
};

export function getComponent(name: string) {
  return COMPONENT_REGISTRY[name] || null;
}
```

### 5.3 按需加载 + 失败降级

System prompt 只放 ~150 token 索引。`load_components` 失败时返回明确错误：

```python
def get_component_docs(names: list[str]) -> str:
    results = []
    for name in names:
        path = f"component-docs/{name}.md"
        if os.path.exists(path):
            results.append(open(path).read())
        else:
            results.append(f"⚠️ 组件 {name} 文档不存在。可用: {', '.join(available)}")
    return "\n---\n".join(results)
```

### 5.4 组件文档自动生成

Props 定义从 TypeScript 源码自动生成（CI 流水线），防止文档与代码不同步。

### 5.5 交互协议与流式保护

业务组件通过 `onAction` prop 与 Claude 通信。流式渲染期间禁用交互，新请求前 abort 当前连接：

```typescript
let currentAbortController: AbortController | null = null;
async function doSend(text: string | null) {
  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();
  const resp = await fetch("/chat", {
    method: "POST",
    body: JSON.stringify({ messages: history }),
    signal: currentAbortController.signal,
  });
}
```

---

## 6. 布局灵活性架构

### 6.1 八个内置布局原语

| 原语     | 作用          | 核心 Props                           |
| -------- | ------------- | ------------------------------------ |
| Box      | 通用容器      | style, className                     |
| Flex     | 弹性布局      | direction, gap, align, justify, wrap |
| Grid     | 网格布局      | columns (number\|string), gap        |
| Stack    | 纵向堆叠      | gap                                  |
| Sidebar  | 固定+弹性双栏 | side, sideWidth, gap                 |
| Split    | 按比例分栏    | ratio ("1:2:1"), gap                 |
| Tabs     | 标签页        | tabs: [{label, key, content}]        |
| Collapse | 折叠面板      | title, defaultOpen                   |

所有原语含 children 数量校验和降级处理。

### 6.2 Style 直通（双重过滤）

key 白名单 + value 安全校验（防止 CSS injection）：

```typescript
function isSafeValue(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase().replace(/\s/g, "");
  return (
    !lower.includes("url(") &&
    !lower.includes("expression(") &&
    !lower.includes("javascript:") &&
    !lower.includes("import(")
  );
}
```

### 6.3 三层渐进灵活度

> **第一层：业务组件** → **第二层：布局原语 + style** → **第三层：RawHTML 兜底**

---

## 7. 定制能力模型

### 7.1 设计原则（v1.3 调整）

**Phase 1 不实现 Slots 机制。** 先用以下四层定制能力上线，收集真实用户反馈后再评估是否需要 Slots。

```
定制成本低 ←──────────────────────────→ 定制成本高

  Props 扩展        Wrapper 组合      组件变体继承      RawHTML 局部/整体
  (视觉/数据微调)    (外部组合)        (行为变体)        (全新功能)
```

### 7.2 Props 扩展

业务组件提供核心 Props（必填最小集）+ 扩展 Props（可选，有默认值）。关键设计——预置单元格渲染器：

```typescript
interface ColumnDef {
  title: string;
  dataIndex: string;
  sortable?: boolean;
  width?: number;
  fixed?: "left" | "right";
  align?: "left" | "center" | "right";
  render?: "tag" | "progress" | "link" | "image"; // 预置渲染器
  renderConfig?: Record<string, any>;
}
```

Claude 使用时只需传 `"render": "tag"`，组件内部映射到真实渲染逻辑。

### 7.3 Wrapper 组合（优先方案）

大多数"定制"实际是"组合"。Claude 用已有布局原语在组件外部组合：

```json
{
  "component": "Flex",
  "props": { "gap": "16px", "align": "center" },
  "children": [
    { "component": "MetricCard", "props": { "title": "GMV", "value": "¥2.4M" } },
    { "component": "LineChart", "props": { "data": [...], "mini": true, "height": 60 } }
  ]
}
```

"指标卡旁边加迷你图"不需要 MetricCard 有 slot，直接 Flex 包裹。

### 7.4 组件变体继承

```typescript
const COMPONENT_REGISTRY = {
  DataTable,
  DataTableExpandable, // 可展开行（变体）
  DataTableEditable, // 行内编辑（变体）
  BarChart,
  BarChartStacked, // 堆叠柱状图（变体）
};
```

Claude 只需换组件名，token 差异几个字符。

### 7.5 FormRenderer 与 visibleWhen 联动

FormRenderer 是本方案新增的核心组件。通过 `fields` 配置数组声明式描述表单，覆盖 85-90% 的表单场景。

```typescript
interface FieldConfig {
  field: string;
  label: string;
  type:
    | "input"
    | "textarea"
    | "password"
    | "number"
    | "select"
    | "multiselect"
    | "radio"
    | "checkbox"
    | "checkboxGroup"
    | "switch"
    | "date"
    | "dateRange";
  required?: boolean;
  placeholder?: string;
  rules?: Rule[];
  options?: Array<{ label: string; value: string } | string>;
  extra?: string;
  tooltip?: string;
  hidden?: boolean;
  disabled?: boolean;
  colSpan?: number;
  componentProps?: Record<string, any>;

  // ★ v1.3 新增：条件可见性（覆盖 80%+ 联动场景）
  visibleWhen?: {
    field: string; // 依赖的字段名
    value: any | any[]; // 当该字段等于这些值时显示
  };
}
```

使用示例：

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
          { "label": "类型A", "value": "A" },
          { "label": "类型B", "value": "B" }
        ]
      },
      {
        "field": "detailA",
        "label": "详情 A",
        "type": "input",
        "visibleWhen": { "field": "type", "value": "A" }
      },
      {
        "field": "detailB",
        "label": "详情 B",
        "type": "textarea",
        "visibleWhen": { "field": "type", "value": "B" }
      }
    ]
  }
}
```

FormRenderer 内部实现：

```tsx
export function FormRenderer({ fields, layout, columns, ... }: FormRendererProps) {
  const [form] = Form.useForm();
  const [values, setValues] = useState({});

  const isVisible = (field: FieldConfig) => {
    if (!field.visibleWhen) return true;
    const current = values[field.visibleWhen.field];
    const target = field.visibleWhen.value;
    return Array.isArray(target) ? target.includes(current) : current === target;
  };

  return (
    <Form form={form} layout={layout}
      onValuesChange={(_, all) => setValues(all)}
      onFinish={(v) => onAction?.({ action: 'submit', data: v })}>
      {fields.filter(isVisible).map(field => (
        <FormField key={field.field} config={field} />
      ))}
    </Form>
  );
}
```

**仅 Form.List（动态增删）和多步骤向导需退到 RawHTML。**

### 7.6 决策流程图（写入 guidelines/core.md）

```
用户的定制需求
    │
    ├─ 能通过调整 props 实现吗？（颜色、尺寸、列配置、开关类）
    │   → YES → 直接传 props
    │
    ├─ 需要在组件旁边/上下加其他组件？
    │   → YES → Wrapper 组合（Flex/Grid/Stack 包裹）
    │
    ├─ 需要不同的交互行为？（展开行、堆叠图）
    │   → YES → 检查有无对应变体组件名
    │
    └─ 完全超出组件库能力？
        → RawHTML 兜底
```

### 7.7 Slots 的定位（Phase 4+ 按需）

当前不实现。Slots 解决"组件内部注入"需求，但从代码 Review 看，核心场景是 dashboard/chart/calculator/diagram，Wrapper 组合已够用。后续收集真实用户反馈，若确认高频需要"内部注入"再针对性添加——这是非破坏性变更（只需给 WidgetNode 加可选字段）。

---

## 8. 流式渲染管线

### 8.1 服务端解析模式（v1.3 决策）

服务端用 Python 的 `json-repair` 做 partial JSON 解析，前端收到结构化数据直接渲染，无需前端 JSON 解析库：

```python
# server.py — WidgetStreamProcessor
import json_repair

class WidgetStreamProcessor:
    def __init__(self):
        self.last_parsed = None

    def process_delta(self, raw: str) -> dict | None:
        # 完整 JSON
        try:
            parsed = json.loads(raw)
            return self._emit(parsed)
        except json.JSONDecodeError:
            pass
        # json-repair 容错
        try:
            parsed = json_repair.loads(raw)
            if isinstance(parsed, dict):
                return self._emit(parsed)
        except Exception:
            pass
        # 兜底：提取已完成的顶层 children 节点
        return self._extract_completed(raw)

    def _emit(self, parsed: dict) -> dict | None:
        if parsed == self.last_parsed:
            return None  # 去重
        self.last_parsed = parsed
        # 自动补全缺失的 id
        self._auto_fill_ids(parsed.get("children", []))
        return parsed

    def _auto_fill_ids(self, nodes, prefix="auto"):
        for i, node in enumerate(nodes):
            if isinstance(node, dict) and not node.get("id"):
                node["id"] = f"{prefix}-{node.get('component','node')}-{i}"
            if isinstance(node, dict) and "children" in node:
                self._auto_fill_ids(node["children"], f"{prefix}-{i}")
```

### 8.2 SSE widget_delta 的 payload 变更

```python
# 旧：前端收到 raw string 自行解析
yield sse({"type": "widget_delta", "html": raw_html})

# 新：前端收到结构化数据直接渲染
parsed = processor.process_delta(config_str)
if parsed:
    yield sse({"type": "widget_delta", "parsed": parsed})
```

### 8.3 WidgetRenderer（前端极简化）

```tsx
export function WidgetRenderer() {
  const [config, setConfig] = useState<Partial<WidgetConfig> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const { setHasWidget, setWidgetTitle } = useWidgetStore();

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { type, parsed, title } = e.detail;
      if (type === "widget_delta") {
        setIsStreaming(true);
        setHasWidget(true);
        setConfig(parsed); // ★ 直接用，无需解析
      }
      if (type === "widget_final") {
        setIsStreaming(false);
        setConfig(parsed);
        if (title) setWidgetTitle(title);
      }
    };
    window.addEventListener("widget-event", handler as EventListener);
    return () =>
      window.removeEventListener("widget-event", handler as EventListener);
  }, []);

  if (!config?.children?.length) return null;
  return (
    <div>
      {config.children.map((node, i) => (
        <RenderNode
          node={node}
          index={i}
          depth={0}
          key={node.id || `${node.component}-${i}`}
          isStreaming={isStreaming}
        />
      ))}
      {isStreaming && <StreamingSkeleton />}
    </div>
  );
}
```

### 8.4 RenderNode（含深度限制 + 淡入修复）

```tsx
const MAX_DEPTH = 15;

export const RenderNode = memo(
  function RenderNode({
    node,
    index,
    depth,
    isStreaming = false,
  }: RenderNodeProps) {
    if (depth > MAX_DEPTH) {
      return <div className="text-red-400 text-sm">渲染深度超过限制</div>;
    }
    // 淡入仅首次 mount
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
      const raf = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(raf);
    }, []);

    if (typeof node === "string") return <>{node}</>;
    const { component, props = {}, style, className, children } = node;

    if (component === "RawHTML")
      return <RawHTMLComponent html={props.html || ""} />;

    const Component = PRIMITIVES[component] || getComponent(component);
    if (!Component) {
      return (
        <div className="border border-dashed border-yellow-500 p-3 rounded text-sm text-yellow-400">
          未注册组件: {component}
        </div>
      );
    }

    const finalProps = {
      ...props,
      style: style ? sanitizeStyle(style) : undefined,
      className,
      ...(!PRIMITIVES[component] && {
        onAction: isStreaming
          ? undefined
          : (data: any) => window.sendToAgent?.({ component, ...data }),
        disabled: isStreaming,
      }),
    };

    return (
      <div className={isMounted ? "" : "animate-fade-in"}>
        <Component {...finalProps}>
          {children?.map((child, i) =>
            typeof child === "string" ? (
              child
            ) : (
              <RenderNode
                node={child}
                index={i}
                depth={depth + 1}
                key={
                  (child as WidgetNode).id ||
                  `${(child as WidgetNode).component}-${i}`
                }
                isStreaming={isStreaming}
              />
            ),
          )}
        </Component>
      </div>
    );
  },
  (prev, next) =>
    prev.node === next.node && prev.isStreaming === next.isStreaming,
);
```

### 8.5 RawHTML 组件（含脚本执行 + 错误降级）

```tsx
export const RawHTMLComponent = memo(function RawHTMLComponent({
  html,
}: {
  html: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevHtmlRef = useRef("");
  useEffect(() => {
    if (!containerRef.current || html === prevHtmlRef.current) return;
    prevHtmlRef.current = html;
    const container = containerRef.current;
    try {
      container.innerHTML = html;
      container.querySelectorAll("script").forEach((old) => {
        try {
          const s = document.createElement("script");
          if (old.src) s.src = old.src;
          else s.textContent = old.textContent;
          if (old.type) s.type = old.type;
          old.parentNode?.replaceChild(s, old);
        } catch (e) {
          console.error("Script exec failed:", e);
        }
      });
    } catch (error) {
      container.innerHTML = `<div style="padding:12px;border:1px solid rgba(239,68,68,0.3);
        border-radius:8px;color:#f87171;font-size:14px">Widget 渲染失败: ${(error as Error).message}</div>`;
    }
    return () => {
      container.innerHTML = "";
    };
  }, [html]);
  return <div ref={containerRef} className="animate-fade-in" />;
});
```

---

## 9. 服务端改造

### 9.1 show_widget 完整工具定义

```python
SHOW_WIDGET_TOOL = {
    "name": "show_widget",
    "description": (
        "渲染一个交互式界面。使用 JSON 描述组件树，前端会用真实 React 组件渲染。"
        "可用组件见 load_components 返回的清单。"
        "若需自定义 HTML（组件库不覆盖的场景），使用 RawHTML 组件。"
        "IMPORTANT: 首次调用前必须先调用 load_guidelines 和 load_components。"
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "i_have_loaded_guidelines": { "type": "boolean" },
            "i_have_loaded_components": { "type": "boolean" },
            "title": { "type": "string",
                "description": "Widget 标题，显示在面板工具栏。" },
            "widget_config": { "type": "string",
                "description": (
                    'JSON 字符串。格式: {"version":1,"children":[{"id":"xxx","component":"MetricCard","props":{...}}]}. '
                    "规则: 1) 每个节点应有 id; 2) 顶层有 version:1; "
                    "3) Tabs 用 content 字段; 4) 优先业务组件 > 布局原语 > RawHTML。"
                ) }
        },
        "required": ["i_have_loaded_guidelines", "i_have_loaded_components", "title", "widget_config"]
    }
}
```

### 9.2 服务端 guidelines_loaded 校验

```python
# server.py — 追踪 guidelines 加载状态
guidelines_loaded = False

for block in final_msg.content:
    if block.name == "load_guidelines":
        guidelines_loaded = True
        ...
    elif block.name == "show_widget":
        if not guidelines_loaded:
            # 自动加载默认 guidelines
            default_guidelines = get_guidelines(["core"])
            # 记录日志但不阻塞
```

### 9.3 异常处理扩大范围

```python
try:
    async with client.messages.stream(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514"),
        max_tokens=int(os.getenv("MAX_TOKENS", "8192")),
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=messages,
    ) as stream:
        async for event in stream:
            ...
except anthropic.APIError as e:
    yield sse({"type": "error", "text": f"API Error: {e.message}"})
    return
except Exception as e:
    yield sse({"type": "error", "text": str(e)})
    return
```

### 9.4 widget_delta 阈值提升

```python
if tc["name"] == "show_widget":
    config_str = extract_widget_config(tc["partial_json"])
    if config_str and len(config_str) > 50:  # ★ 从 15 提升到 50
        parsed = processor.process_delta(config_str)
        if parsed:
            yield sse({"type": "widget_delta", "parsed": parsed})
```

### 9.5 SSE 完整事件定义

| 事件 type      | Payload                   | 说明                           |
| -------------- | ------------------------- | ------------------------------ |
| `text`         | `{ type, text }`          | Claude 文本 token              |
| `status`       | `{ type, text }`          | 工具调用状态                   |
| `widget_delta` | `{ type, parsed }`        | 结构化的 partial widget config |
| `widget_final` | `{ type, parsed, title }` | 完整 widget config + 标题      |
| `error`        | `{ type, text }`          | 异常信息                       |
| `done`         | `{ type }`                | 流结束                         |

### 9.6 extract_widget_config（含 unicode + surrogate）

```python
def extract_widget_config(partial_json: str) -> str | None:
    try:
        data = json.loads(partial_json)
        return data.get("widget_config")
    except json.JSONDecodeError:
        pass
    key = '"widget_config"'
    idx = partial_json.find(key)
    if idx == -1:
        return None
    rest = partial_json[idx + len(key):]
    colon = rest.find(':')
    if colon == -1:
        return None
    rest = rest[colon + 1:].lstrip()
    if not rest.startswith('"'):
        return None
    content = rest[1:]
    result = []
    i = 0
    while i < len(content):
        c = content[i]
        if c == '\\' and i + 1 < len(content):
            n = content[i + 1]
            if n == 'u' and i + 5 < len(content):
                hex_str = content[i + 2:i + 6]
                try:
                    cp = int(hex_str, 16)
                    if 0xD800 <= cp <= 0xDBFF:  # surrogate pair
                        if (i + 11 < len(content) and content[i+6:i+8] == '\\u'):
                            low = int(content[i+8:i+12], 16)
                            if 0xDC00 <= low <= 0xDFFF:
                                result.append(chr(0x10000 + (cp-0xD800)*0x400 + (low-0xDC00)))
                                i += 12; continue
                        break
                    elif 0xDC00 <= cp <= 0xDFFF:
                        i += 6; continue
                    else:
                        result.append(chr(cp)); i += 6; continue
                except ValueError: pass
            escapes = {'n':'\n','t':'\t','r':'\r','\\':'\\','"':'"','/':'/','b':'\b','f':'\f'}
            result.append(escapes.get(n, n)); i += 2
        elif c == '"': break
        else: result.append(c); i += 1
    return ''.join(result) if result else None
```

### 9.7 会话缓存

```python
class SessionCache:
    def __init__(self):
        self.guidelines: dict[str, str] = {}
        self.components: dict[str, str] = {}
    def get_guidelines(self, modules): ...  # 缓存后直接返回
    def get_components(self, names): ...
```

---

## 10. Guidelines 迁移与工具职责划分

### 10.1 职责划分

| 工具              | 职责                        | 返回内容                                                |
| ----------------- | --------------------------- | ------------------------------------------------------- |
| `load_guidelines` | 通用设计规范和 DSL 规则     | CSS 变量表、JSON DSL 语法、布局原语用法、定制优先级规则 |
| `load_components` | 具体业务组件的 Props 和示例 | 单个组件的 interface、props 说明、JSON 示例             |

### 10.2 模块迁移

| 原模块       | 新内容                                                  | 说明                     |
| ------------ | ------------------------------------------------------- | ------------------------ |
| `core.md`    | CSS 变量 + JSON DSL 语法 + 定制决策树                   | 每次必加载               |
| `chart.md`   | 图表数据格式约定（注明 Chart.js 需 hex 颜色）           | 不再含 Chart.js 配置模板 |
| `diagram.md` | RawHTML SVG 规则（**改用 inline style 支持 CSS 变量**） | 仅 RawHTML 场景          |
| `mockup.md`  | 布局原语组合最佳实践                                    | 示例改为 JSON DSL        |
| `form.md`    | **废弃**，由 FormRenderer 组件 + load_components 替代   | —                        |

### 10.3 System prompt 精简

从 system.py 中**移除** CSS 变量完整列表（已在 core.md 中），只保留一句话引用。**每次请求省 ~200 token。**

新增非可视化请求指导：

```
For purely text-based questions, respond normally without calling any tools.
```

### 10.4 Guidelines 中的已知矛盾修复

- chart.md 示例去掉注释（与 core.md "no comments" 规则一致）
- diagram.md SVG 改用 `style="fill:var(--color-surface)"` 替代 `fill="#1a1a1a"`
- core.md 增加说明："Chart.js 配置需要字面颜色值（不支持 CSS 变量），使用 chart.md 中列出的 hex 值。"

---

## 11. 渐进式迁移方案

### 11.1 双模式并存

服务端根据工具返回的字段自动判断：

```python
if "widget_code" in block.input:
    yield sse({"type": "widget_final", "mode": "html", "html": ..., "title": ...})
elif "widget_config" in block.input:
    parsed = json.loads(block.input["widget_config"])
    yield sse({"type": "widget_final", "mode": "json_dsl", "parsed": parsed, "title": ...})
```

### 11.2 Feature Flag

```python
FEATURE_FLAGS = {"use_json_dsl": os.getenv("USE_JSON_DSL", "false") == "true"}
def get_tools():
    if FEATURE_FLAGS["use_json_dsl"]:
        return [LOAD_GUIDELINES_TOOL, LOAD_COMPONENTS_TOOL, SHOW_WIDGET_DSL_TOOL]
    else:
        return [LOAD_GUIDELINES_TOOL, SHOW_WIDGET_HTML_TOOL]
```

### 11.3 三阶段灰度

- **Phase A：** flag=off，内部测试新模式
- **Phase B：** flag=on，部分用户灰度，可按会话回滚
- **Phase C：** 全量切换，保留旧代码 30 天后移除

---

## 12. 完整示例：复杂 Dashboard

```json
{
  "version": 1,
  "children": [
    {
      "id": "layout-main",
      "component": "Sidebar",
      "props": { "sideWidth": "280px" },
      "children": [
        {
          "id": "filter",
          "component": "SearchForm",
          "props": { "fields": ["dateRange", "category", "region"] }
        },
        {
          "id": "content",
          "component": "Stack",
          "props": { "gap": "20px" },
          "children": [
            {
              "id": "metrics",
              "component": "Grid",
              "props": { "columns": 3, "gap": "12px" },
              "children": [
                {
                  "id": "m-gmv",
                  "component": "MetricCard",
                  "props": { "title": "GMV", "value": "¥2.4M", "trend": "+15%" }
                },
                {
                  "id": "m-users",
                  "component": "MetricCard",
                  "props": {
                    "title": "用户数",
                    "value": "89,231",
                    "trend": "+8%"
                  }
                },
                {
                  "id": "m-price",
                  "component": "MetricCard",
                  "props": {
                    "title": "客单价",
                    "value": "¥268",
                    "trend": "-2%"
                  }
                }
              ]
            },
            {
              "id": "charts",
              "component": "Split",
              "props": { "ratio": "2:1", "gap": "16px" },
              "children": [
                {
                  "id": "c-trend",
                  "component": "LineChart",
                  "props": { "title": "GMV 趋势" }
                },
                {
                  "id": "c-pie",
                  "component": "PieChart",
                  "props": { "title": "品类占比" }
                }
              ]
            },
            {
              "id": "tabs",
              "component": "Tabs",
              "props": {
                "defaultTab": "cat",
                "tabs": [
                  {
                    "label": "按品类",
                    "key": "cat",
                    "content": {
                      "id": "t-cat",
                      "component": "DataTable",
                      "props": { "columns": "...", "rows": "..." }
                    }
                  },
                  {
                    "label": "按地区",
                    "key": "region",
                    "content": {
                      "id": "t-region",
                      "component": "DataTable",
                      "props": { "columns": "...", "rows": "..." }
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 13. 架构全面对比

| 维度       | 原方案 (HTML + morphdom)    | 新方案 (JSON DSL + React)     |
| ---------- | --------------------------- | ----------------------------- |
| 组件复用   | 不可能，每次从零生成        | 直接使用基于 Arco 的组件      |
| 输出 Token | 300-500 行 HTML             | 30-50 行 JSON (-70~80%)       |
| 流式渲染   | 像素级渐进（HTML 逐字长出） | 组件级渐进（逐个弹出）        |
| DOM Diff   | morphdom（与 React 冲突）   | React reconciliation          |
| JSON 解析  | 前端手写 parser             | 服务端 json-repair            |
| 主题/样式  | CSS 变量（需遵守）          | 组件自带 Arco 主题            |
| 交互       | sendToAgent (全局)          | onAction prop (类型安全)      |
| 脚本安全   | 主页面执行，高风险          | 组件内封装，RawHTML 走 iframe |
| 构建       | 无构建，CDN 引入            | Vite 构建，模块化开发         |
| 迁移       | —                           | 双模式 + Feature Flag         |

---

## 14. 实施路线

### Phase 0：DSL 合规性验证（1 周）

> **这是 Phase 1 之前的必要前提。**

用当前 Claude 模型对 20 个典型场景做 DSL 输出测试：

| 场景类别       | 测试用例                                   |
| -------------- | ------------------------------------------ |
| 简单组件       | 单个 MetricCard、单个 BarChart             |
| 组合布局       | Grid 三列指标卡、Sidebar + Table           |
| 复杂 Dashboard | 筛选+指标+图表+表格                        |
| 表单           | SearchForm、FormRenderer（含 visibleWhen） |
| 定制需求       | "表格加斑马纹"、"卡片旁边加迷你图"         |
| 边界           | Tabs、深层嵌套、中文内容                   |

**通过标准：** DSL 输出合规率 ≥ 80%（JSON 可解析、组件名正确、结构合法）。低于 80% 则优化 system prompt / 工具描述 / few-shot 示例后重测。

### Phase 1：基础架构迁移（2-3 周）

- Vite 项目初始化 + Arco 集成 + 主题对齐
- 组件注册表、八个布局原语（含 children 校验）
- WidgetRenderer + RenderNode（深度限制、淡入、memo）
- RawHTML 兜底（脚本执行 + try-catch + 错误降级）
- 服务端：widget_config 字段、WidgetStreamProcessor（json-repair）、异常处理扩大、model/max_tokens 环境变量、widget_delta 阈值提升到 50、guidelines_loaded 校验
- 双模式并存 + Feature Flag
- System prompt 精简（移除重复变量列表、增加非可视化指导）

### Phase 2：组件与交互（1-2 周）

- 业务组件封装（MetricCard / DataTable / BarChart / SearchForm / FormRenderer 等）
- FormRenderer 含 visibleWhen 联动
- onAction 交互协议 + 流式禁用保护
- AbortController + SSE 超时 (60s)
- sendToAgent 防抖
- load_components 工具 + 组件文档自动生成
- Guidelines 迁移（core.md v2、diagram.md style 修复、chart.md 注释清理）

### Phase 3：健壮性与体验（1-2 周）

- 会话级 guidelines/components 缓存
- History 滑动窗口 / 摘要压缩
- sanitizeStyle 双重过滤
- 错误边界 UI
- RawHTML 迁移到 iframe 沙箱

### Phase 4：进阶功能（按需）

- Slots 机制（收集真实反馈后决定）
- 多 Widget 并存
- Widget 状态持久化
- 无障碍 ARIA 支持
- 自适应 debounce

---

## 15. 项目文件结构

```
generative-ui-demo/
├─ server.py                    # FastAPI SSE 流式代理（含 WidgetStreamProcessor）
├─ tools.py                     # show_widget + load_components + load_guidelines
├─ system.py                    # System prompt（精简版，~150 token 索引）
├─ guidelines/                  # 设计指南（v2，面向 JSON DSL）
│  ├─ core.md                   # CSS 变量 + DSL 语法 + 定制决策树
│  ├─ chart.md                  # 图表数据格式（无注释）
│  ├─ diagram.md                # SVG 规则（inline style）
│  └─ mockup.md                 # 布局原语最佳实践
├─ component-docs/              # 组件文档（CI 自动生成）
├─ scripts/
│  └─ generate-component-docs.ts
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
├─ src/
│  ├─ index.html
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ ChatPanel.tsx
│  ├─ WidgetPanel.tsx           # 含空状态 / 双模式路由
│  ├─ registry.ts
│  ├─ types.ts                  # WidgetNode / WidgetConfig
│  ├─ sanitizeStyle.ts
│  ├─ WidgetRenderer.tsx        # 消费服务端解析后的结构化数据
│  ├─ RenderNode.tsx            # memo + 深度限制 + 淡入
│  ├─ RawHTMLComponent.tsx      # 脚本执行 + 错误降级
│  ├─ LegacyHtmlRenderer.tsx    # 迁移期保留
│  ├─ StreamingSkeleton.tsx
│  ├─ stores/widgetStore.ts
│  ├─ styles/global.css         # CSS 变量 + Arco 主题覆盖
│  ├─ primitives/               # 布局原语（含 children 校验）
│  │  ├─ Box / Flex / Grid / Stack / Sidebar / Split / Tabs / Collapse
│  └─ components/               # 业务组件（基于 Arco 封装）
│     ├─ MetricCard / BarChart / LineChart / PieChart
│     ├─ DataTable / DataTableExpandable / DataTableEditable
│     ├─ SearchForm / FormRenderer（含 visibleWhen）
│     ├─ StatusTag / StepFlow
│     └─ BarChartStacked
├─ static/
│  ├─ dist/                     # Vite 构建产物
│  └─ legacy/                   # 原版静态文件（迁移期）
```

---

## 16. 风险与缓解

### 16.1 结构性风险

| 风险                  | 等级    | 缓解                                                                                                                         |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Claude DSL 合规率不足 | 🔴 中高 | **Phase 0 验证阶段**（≥80% 合规率才启动开发）；服务端自动补全 id；RenderNode 降级而非崩溃；load_components 提供充足 few-shot |
| FormRenderer 覆盖不够 | 🟠 中   | **visibleWhen** 条件联动覆盖 80%+；Form.List/多步骤退 RawHTML                                                                |

### 16.2 代码 Review 发现的问题

| 问题                                | 状态    | 措施                            |
| ----------------------------------- | ------- | ------------------------------- |
| extract_widget_code 无 unicode 处理 | ✅ 修复 | 完整 `\uXXXX` + surrogate pair  |
| 异常处理不包裹 async with           | ✅ 修复 | 扩大 try-except + APIError 分类 |
| 无并发请求保护                      | ✅ 修复 | AbortController + 服务端去重    |
| widget_delta 阈值 15                | ✅ 修复 | 提升到 50                       |
| model 硬编码                        | ✅ 修复 | 环境变量 `CLAUDE_MODEL`         |
| max_tokens=8096                     | ✅ 修复 | 改为 8192，环境变量             |
| system prompt 与 core.md 变量重复   | ✅ 修复 | system prompt 精简              |
| SSE 读取无超时                      | ✅ 修复 | 前端 60s 超时                   |
| sendToAgent 无防抖                  | ✅ 修复 | debounce 500ms                  |
| runScripts 无 try-catch             | ✅ 修复 | 单脚本级容错                    |
| i_have_seen_guidelines 无校验       | ✅ 修复 | 服务端 guidelines_loaded 追踪   |
| 缺少非可视化请求指导                | ✅ 修复 | system prompt 增加指导          |
| chart.md 有注释违反 core.md         | ✅ 修复 | 清理示例注释                    |
| diagram.md SVG 硬编码颜色           | ✅ 修复 | 改用 inline style               |
| load_guidelines enum 不全           | ✅ 修复 | 确认并补全                      |

### 16.3 残余风险

| 风险                      | 阶段    | 说明               |
| ------------------------- | ------- | ------------------ |
| RawHTML 仍在主页面执行 JS | Phase 3 | 迁移到 iframe 沙箱 |
| style 白名单可能过严      | 持续    | 定期扩充           |
| history 无限增长          | Phase 3 | 滑动窗口/摘要压缩  |
