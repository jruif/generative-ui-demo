import { Form, Input, InputNumber, Select, DatePicker, Radio, Checkbox, Switch, Button } from "@arco-design/web-react";
import { useState } from "react";
import type { ComponentType } from "react";

const FormItem = Form.Item;
const TextArea = Input.TextArea;

interface VisibleWhen {
  field: string;
  value: unknown;
}

interface FieldConfig {
  field: string;
  label?: string;
  type?: string;
  options?: Array<{ label: string; value: string } | string>;
  visibleWhen?: VisibleWhen;
  placeholder?: string;
  required?: boolean;
}

interface FormRendererProps {
  fields?: FieldConfig[];
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

export const FormRenderer: ComponentType<FormRendererProps> = ({ fields = [], onAction, disabled }) => {
  const [form] = Form.useForm();
  const [values, setValues] = useState<Record<string, unknown>>({});

  const isVisible = (f: FieldConfig) => {
    if (!f.visibleWhen) return true;
    const current = values[f.visibleWhen.field];
    const target = f.visibleWhen.value;
    return Array.isArray(target) ? target.includes(current) : current === target;
  };

  const visibleFields = fields.filter(isVisible);

  const renderField = (f: FieldConfig) => {
    const opts = f.options ?? [];
    const selectOptions = opts.map((o) =>
      typeof o === "string" ? { label: o, value: o } : { label: o.label, value: o.value }
    );

    switch (f.type) {
      case "textarea":
        return <TextArea placeholder={f.placeholder} disabled={disabled} />;
      case "number":
        return <InputNumber placeholder={f.placeholder} disabled={disabled} style={{ width: "100%" }} />;
      case "password":
        return <Input.Password placeholder={f.placeholder} disabled={disabled} />;
      case "select":
        return (
          <Select
            placeholder={f.placeholder}
            options={selectOptions}
            disabled={disabled}
            allowClear
          />
        );
      case "radio":
        return (
          <Radio.Group options={selectOptions} disabled={disabled} />
        );
      case "checkbox":
        return <Checkbox disabled={disabled} />;
      case "switch":
        return <Switch disabled={disabled} />;
      case "date":
        return <DatePicker style={{ width: "100%" }} disabled={disabled} />;
      default:
        return <Input placeholder={f.placeholder} disabled={disabled} />;
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={(_, v) => setValues(v)}
      onSubmit={(v) => {
        if (!disabled && onAction) onAction({ action: "submit", data: v });
      }}
    >
      {visibleFields.map((f) => (
        <FormItem
          key={f.field}
          field={f.field}
          label={f.label ?? f.field}
          required={f.required}
        >
          {renderField(f)}
        </FormItem>
      ))}
      <FormItem>
        <Button type="primary" htmlType="submit" disabled={disabled}>
          提交
        </Button>
      </FormItem>
    </Form>
  );
};
