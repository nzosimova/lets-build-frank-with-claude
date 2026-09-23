// Turns what the form holds into the exact `arguments` object a tool expects.
// Form controls hold strings (Input, Select, Textarea) or booleans (Checkbox);
// tools want numbers, enum values of their real type, and parsed JSON.

export interface JsonSchema {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  default?: unknown;
  [key: string]: unknown;
}

export type FieldKind = "enum" | "string" | "number" | "integer" | "boolean" | "json";

/** `enum` wins over `type`: `{ type: "string", enum: [...] }` is a Select. */
export function fieldKind(schema: JsonSchema): FieldKind {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return "enum";
  switch (schema.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "integer":
      return "integer";
    case "boolean":
      return "boolean";
    default:
      return "json"; // objects, arrays, unions, $ref, … — one validated JSON editor
  }
}

/** String for Input/Textarea/Select (the enum index), boolean for Checkbox. */
export type FormValue = string | boolean | undefined;
export type FormValues = Record<string, FormValue>;

export interface Serialized {
  args: Record<string, unknown>;
  errors: Record<string, string>;
}

export function initialValues(schema: JsonSchema): FormValues {
  const values: FormValues = {};
  const required = new Set(schema.required ?? []);
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const kind = fieldKind(prop);
    if (kind === "boolean") {
      values[name] = typeof prop.default === "boolean" ? prop.default : required.has(name) ? false : undefined;
    } else if (kind === "enum") {
      const i = prop.default === undefined ? -1 : prop.enum!.indexOf(prop.default);
      values[name] = i >= 0 ? String(i) : "";
    } else if (prop.default !== undefined) {
      values[name] = kind === "json" ? JSON.stringify(prop.default, null, 2) : String(prop.default);
    } else {
      values[name] = "";
    }
  }
  return values;
}

export function serialize(schema: JsonSchema, values: FormValues): Serialized {
  const args: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const required = new Set(schema.required ?? []);

  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const kind = fieldKind(prop);
    const raw = values[name];

    if (kind === "boolean") {
      if (typeof raw === "boolean") args[name] = raw;
      else if (required.has(name)) args[name] = false;
      continue;
    }

    const text = typeof raw === "string" ? raw : "";
    if (text.trim() === "") {
      if (required.has(name)) errors[name] = "Required";
      continue; // empty optional fields are omitted, not sent as ""
    }

    switch (kind) {
      case "enum": {
        const i = Number(text);
        if (Number.isInteger(i) && i >= 0 && i < prop.enum!.length) args[name] = prop.enum![i];
        else errors[name] = "Choose one of the options";
        break;
      }
      case "number":
      case "integer": {
        const n = Number(text);
        if (!Number.isFinite(n)) errors[name] = "Must be a number";
        else if (kind === "integer" && !Number.isInteger(n)) errors[name] = "Must be a whole number";
        else args[name] = n;
        break;
      }
      case "json":
        try {
          args[name] = JSON.parse(text);
        } catch {
          errors[name] = "Not valid JSON";
        }
        break;
      default:
        args[name] = text;
    }
  }
  return { args, errors };
}
