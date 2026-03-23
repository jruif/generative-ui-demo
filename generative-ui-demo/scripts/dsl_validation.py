#!/usr/bin/env python3
"""
Phase 0: DSL 合规性验证框架

用当前 Claude 模型对 20 个典型场景做 DSL 输出测试。
通过标准：JSON 可解析、组件名正确、结构合法，合规率 ≥ 80%。
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

# 允许的布局原语
PRIMITIVES = {"Box", "Flex", "Grid", "Stack", "Sidebar", "Split", "Tabs", "Collapse"}

# 允许的业务组件（与 registry 对齐）
COMPONENTS = {
    "MetricCard",
    "BarChart",
    "LineChart",
    "PieChart",
    "DataTable",
    "DataTableExpandable",
    "DataTableEditable",
    "SearchForm",
    "FormRenderer",
    "StatusTag",
    "StepFlow",
    "BarChartStacked",
    "RawHTML",
}

ALLOWED_COMPONENTS = PRIMITIVES | COMPONENTS

DSL_SYSTEM_PROMPT = """You output JSON only, matching the WidgetConfig schema. No markdown, no explanation.

WidgetConfig = { "version": 1, "children": [WidgetNode, ...] }
WidgetNode = { "id"? string, "component": string, "props"? object, "style"? object, "className"? string, "children"? (WidgetNode|string)[] }

For Tabs: props.tabs = [{ "label": string, "key": string, "content": WidgetNode }]
Allowed components: Box, Flex, Grid, Stack, Sidebar, Split, Tabs, Collapse, MetricCard, BarChart, LineChart, PieChart, DataTable, SearchForm, FormRenderer, StatusTag, StepFlow, RawHTML."""


SCENARIOS = [
    # 简单组件
    ("single_metric", "单个 MetricCard 显示 GMV ¥2.4M，趋势 +15%"),
    ("single_barchart", "单个 BarChart 展示品类销售数据"),
    # 组合布局
    ("grid_metrics", "Grid 三列指标卡：GMV、用户数、客单价"),
    ("sidebar_table", "Sidebar 左侧筛选表单 + 右侧数据表格"),
    # 复杂 Dashboard
    ("full_dashboard", "筛选+指标+图表+表格的完整 Dashboard"),
    # 表单
    ("search_form", "SearchForm 含日期范围、品类、地区筛选"),
    ("form_visiblewhen", "FormRenderer 含 visibleWhen：选择类型 A 显示详情 A，选择 B 显示详情 B"),
    # 定制需求
    ("table_striped", "表格加斑马纹（DataTable props）"),
    ("card_with_minichart", "指标卡片旁边加迷你图（Flex 包裹 MetricCard + LineChart mini）"),
    # 边界
    ("tabs", "Tabs 两个 tab：按品类表格、按地区表格"),
    ("deep_nested", "Sidebar 内 Stack 内 Grid 内三个 MetricCard"),
    ("chinese_content", "中文标题和内容的 MetricCard：今日销售额 ¥128万"),
    # 补充至 20+
    ("line_chart", "单个 LineChart 展示 GMV 趋势"),
    ("pie_chart", "单个 PieChart 展示品类占比"),
    ("status_tags", "StatusTag 展示待处理、已通过、已拒绝三个状态"),
    ("split_layout", "Split 2:1 左右分栏，左侧图表右侧表格"),
    ("collapse_panel", "Collapse 折叠面板，标题为「高级筛选」"),
    ("stack_cards", "Stack 纵向堆叠三个 MetricCard"),
    ("flex_row", "Flex 水平排列两个 MetricCard，gap 16px"),
    ("box_container", "Box 包裹一个 MetricCard，设置 padding"),
]


def extract_json_from_response(text: str) -> str | None:
    """从模型输出中提取 JSON（可能被 markdown 包裹）"""
    text = text.strip()
    # 尝试直接解析
    # 常见包裹: ```json ... ``` 或 ``` ... ```
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        return m.group(1).strip()
    # 尝试找 { ... } 块
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i, c in enumerate(text[start:], start):
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def validate_structure(obj: dict) -> list[str]:
    """校验 WidgetConfig 结构，返回错误列表"""
    errors = []
    if not isinstance(obj, dict):
        errors.append("根节点必须是对象")
        return errors
    if "version" not in obj:
        errors.append("缺少 version 字段")
    elif obj.get("version") != 1:
        errors.append("version 应为 1")
    if "children" not in obj:
        errors.append("缺少 children 字段")
    elif not isinstance(obj["children"], list):
        errors.append("children 必须是数组")
    else:
        for i, child in enumerate(obj["children"]):
            errs = _validate_node(child, path=f"children[{i}]")
            errors.extend(errs)
    return errors


def _validate_node(node: dict, path: str, depth: int = 0) -> list[str]:
    if depth > 15:
        return [f"{path}: 嵌套深度超过 15"]
    errors = []
    if not isinstance(node, dict):
        errors.append(f"{path}: 节点必须是对象")
        return errors
    comp = node.get("component")
    if not comp:
        errors.append(f"{path}: 缺少 component")
    elif comp not in ALLOWED_COMPONENTS:
        errors.append(f"{path}: 未知组件 '{comp}'")
    if "children" in node:
        kids = node["children"]
        if not isinstance(kids, list):
            errors.append(f"{path}: children 必须是数组")
        else:
            for j, k in enumerate(kids):
                if isinstance(k, str):
                    continue
                if isinstance(k, dict):
                    errs = _validate_node(k, f"{path}.children[{j}]", depth + 1)
                    errors.extend(errs)
                else:
                    errors.append(f"{path}.children[{j}]: 必须是 WidgetNode 或 string")
    # Tabs 特殊：content 为 WidgetNode
    if comp == "Tabs" and "props" in node:
        tabs = node["props"].get("tabs", [])
        for t, tab in enumerate(tabs):
            if isinstance(tab, dict) and "content" in tab:
                c = tab["content"]
                if isinstance(c, dict):
                    errs = _validate_node(c, f"{path}.props.tabs[{t}].content", depth + 1)
                    errors.extend(errs)
    return errors


def run_scenario(name: str, prompt: str, run_api: bool = True) -> tuple[bool, str]:
    """运行单个场景，返回 (合规, 详情)"""
    if not run_api:
        return (False, "API 未启用（设置 RUN_DSL_API=1 执行真实调用）")
    try:
        import anthropic
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=4096,
            system=DSL_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"输出 WidgetConfig JSON：{prompt}"}],
        )
        text = msg.content[0].text
    except Exception as e:
        return (False, f"API 错误: {e}")

    raw = extract_json_from_response(text)
    if not raw:
        return (False, "无法提取 JSON")

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        return (False, f"JSON 解析失败: {e}")

    errs = validate_structure(parsed)
    if errs:
        return (False, "; ".join(errs[:3]))  # 最多 3 条
    return (True, "OK")


def main() -> None:
    run_api = os.getenv("RUN_DSL_API", "").lower() in ("1", "true", "yes")
    results: list[tuple[str, bool, str]] = []
    for name, prompt in SCENARIOS:
        ok, detail = run_scenario(name, prompt, run_api)
        results.append((name, ok, detail))
        status = "✓" if ok else "✗"
        print(f"  {status} {name}: {detail}")

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    pct = (passed / total * 100) if total else 0
    print(f"\n合规率: {passed}/{total} = {pct:.0f}%")
    if pct >= 80:
        print("通过标准 (≥80%)")
    else:
        print("未达标准，需优化 prompt / 工具描述 / few-shot 后重测")

    # 写入记录
    out = Path(__file__).parent.parent / "log" / "dsl_validation_results.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(
            {"scenarios": [{"name": n, "passed": p, "detail": d} for n, p, d in results], "rate": pct},
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"结果已写入 {out}")


if __name__ == "__main__":
    main()
