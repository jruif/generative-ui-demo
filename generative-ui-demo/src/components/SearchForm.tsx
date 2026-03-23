import { Form, Input, Button, Space } from "@arco-design/web-react";
import type { ComponentType } from "react";

const FormItem = Form.Item;

interface SearchFormProps {
  fields?: string[];
  onAction?: (data: unknown) => void;
  disabled?: boolean;
}

export const SearchForm: ComponentType<SearchFormProps> = ({ fields = [], onAction, disabled }) => {
  const [form] = Form.useForm();
  const f = fields.slice(0, 10);

  return (
    <Form
      form={form}
      layout="inline"
      onSubmit={(v) => {
        if (!disabled && onAction) onAction({ action: "search", data: v });
      }}
    >
      <Space wrap size="medium">
        {f.map((name, i) => (
          <FormItem key={i} field={name} label={name} style={{ marginBottom: 0 }}>
            <Input placeholder={name} disabled={disabled} style={{ minWidth: 120 }} />
          </FormItem>
        ))}
        <FormItem style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" disabled={disabled}>
            搜索
          </Button>
        </FormItem>
      </Space>
    </Form>
  );
};
