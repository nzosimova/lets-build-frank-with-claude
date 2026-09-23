import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useState, type FormEvent } from "react";
import { fieldKind, initialValues, serialize, type FormValues, type JsonSchema } from "./serialize";

interface Props {
  schema: JsonSchema;
  submitting?: boolean;
  onSubmit: (args: Record<string, unknown>) => void;
}

/**
 * A form rendered from a tool's input schema, so a new tool appears in the
 * console with no UI work (ADR-003).
 */
export function SchemaForm({ schema, submitting, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>(() => initialValues(schema));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const properties = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);

  const set = (name: string, value: FormValues[string]) => setValues((v) => ({ ...v, [name]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = serialize(schema, values);
    setErrors(result.errors);
    if (Object.keys(result.errors).length === 0) onSubmit(result.args);
  };

  return (
    <form onSubmit={submit}>
      <Form
        actions={
          <Button variant="primary" formAction="submit" loading={submitting}>
            Run
          </Button>
        }
      >
        <SpaceBetween size="m">
          {properties.length === 0 && <Box color="text-body-secondary">This tool takes no input.</Box>}
          {properties.map(([name, prop]) => {
            const kind = fieldKind(prop);
            const value = values[name];
            const common = { errorText: errors[name], description: prop.description };
            const label = required.has(name) ? name : `${name} (optional)`;

            if (kind === "boolean") {
              return (
                <FormField key={name} {...common}>
                  <Checkbox checked={value === true} onChange={({ detail }) => set(name, detail.checked)}>
                    {label}
                  </Checkbox>
                </FormField>
              );
            }
            if (kind === "enum") {
              const options = prop.enum!.map((v, i) => ({ value: String(i), label: String(v) }));
              return (
                <FormField key={name} label={label} {...common}>
                  <Select
                    selectedOption={options.find((o) => o.value === value) ?? null}
                    options={options}
                    placeholder="Choose an option"
                    onChange={({ detail }) => set(name, detail.selectedOption.value)}
                  />
                </FormField>
              );
            }
            if (kind === "json") {
              return (
                <FormField key={name} label={label} constraintText="JSON" {...common}>
                  <Textarea
                    value={typeof value === "string" ? value : ""}
                    onChange={({ detail }) => set(name, detail.value)}
                  />
                </FormField>
              );
            }
            return (
              <FormField key={name} label={label} {...common}>
                <Input
                  type={kind === "string" ? "text" : "number"}
                  inputMode={kind === "integer" ? "numeric" : kind === "number" ? "decimal" : undefined}
                  value={typeof value === "string" ? value : ""}
                  onChange={({ detail }) => set(name, detail.value)}
                />
              </FormField>
            );
          })}
        </SpaceBetween>
      </Form>
    </form>
  );
}
