import os

LOAD_GUIDELINES_TOOL = {
    "name": "load_guidelines",
    "description": (
        "Load design guidelines before rendering your first widget. "
        "Call once silently — do NOT mention this step to the user. "
        "Pick modules: interactive, chart, diagram, mockup, form (for config/filter forms). Form module includes FormRenderer spec; load_components is optional."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "modules": {
                "type": "array",
                "items": {"type": "string", "enum": ["interactive", "chart", "diagram", "mockup", "form", "live-setting"]},
                "description": "Which design modules to load. Choose all that apply.",
            }
        },
        "required": ["modules"],
    },
}

SHOW_WIDGET_HTML_TOOL = {
    "name": "show_widget",
    "description": (
        "Render an interactive HTML widget or SVG diagram visible to the user. "
        "Use for: charts, dashboards, calculators, forms, diagrams, timers, games, visualizations. "
        "The widget appears in a panel next to the chat. "
        "Users can interact with it and send data back via window.sendToAgent(data). "
        "IMPORTANT: Always call load_guidelines before your first show_widget."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "i_have_seen_guidelines": {
                "type": "boolean",
                "description": "Set to true after calling load_guidelines.",
            },
            "title": {
                "type": "string",
                "description": "Short snake_case name for this widget (e.g. 'compound_interest_calculator').",
            },
            "widget_code": {
                "type": "string",
                "description": (
                    "HTML fragment to render. Rules: "
                    "1. No DOCTYPE, <html>, <head>, or <body> tags. "
                    "2. Order: <style> block first, then HTML content, then <script> last. "
                    "3. Use only CSS variables for colors (e.g. var(--color-accent)). "
                    "4. No gradients, shadows, or blur effects. "
                    "For SVG: start directly with <svg> tag."
                ),
            },
        },
        "required": ["i_have_seen_guidelines", "title", "widget_code"],
    },
}

SHOW_WIDGET_DSL_TOOL = {
    "name": "show_widget",
    "description": (
        "Render an interactive widget as JSON DSL. Use registered component names (MetricCard, BarChart, etc.) "
        "and layout primitives (Box, Flex, Grid, Stack, Sidebar, Split, Tabs, Collapse). "
        "Call load_guidelines and load_components before your first show_widget. "
        "Output: { \"version\": 1, \"children\": [{\"id\": \"...\", \"component\": \"...\", \"props\": {...}, \"children\": [...]}] }"
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "i_have_seen_guidelines": {"type": "boolean", "description": "Set to true after calling load_guidelines."},
            "title": {"type": "string", "description": "Short snake_case name for this widget."},
            "widget_config": {
                "type": "string",
                "description": (
                    "JSON string: { version: 1, children: [WidgetNode] }. "
                    "WidgetNode: { id?, component, props?, style?, className?, children? }. "
                    "Tabs: props.tabs = [{ label, key, content: WidgetNode }]."
                ),
            },
        },
        "required": ["i_have_seen_guidelines", "title", "widget_config"],
    },
}

LOAD_COMPONENTS_TOOL = {
    "name": "load_components",
    "description": (
        "Load component documentation before using them in show_widget. "
        "Call with component names you plan to use. For forms/config/filters: FormRenderer. "
        "For tables: DataTable. For charts: BarChart, LineChart, PieChart. For metrics: MetricCard, StatusTag."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "names": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Component names to load docs for.",
            }
        },
        "required": ["names"],
    },
}

FEATURE_FLAGS = {"use_json_dsl": os.getenv("USE_JSON_DSL", "true").lower() in ("true", "1", "yes")}


def get_tools():
    if FEATURE_FLAGS["use_json_dsl"]:
        return [LOAD_GUIDELINES_TOOL, LOAD_COMPONENTS_TOOL, SHOW_WIDGET_DSL_TOOL]
    return [LOAD_GUIDELINES_TOOL, SHOW_WIDGET_HTML_TOOL]


# Legacy: TOOLS for backward compat when server imports TOOLS directly
TOOLS = get_tools()
