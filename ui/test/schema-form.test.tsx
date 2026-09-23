import createWrapper from "@cloudscape-design/components/test-utils/dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SchemaForm } from "../src/components/SchemaForm";
import type { JsonSchema } from "../src/components/serialize";

const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector("form")!);

describe("SchemaForm", () => {
  it("renders the matching control for each schema type", () => {
    const schema: JsonSchema = {
      properties: {
        text: { type: "string", description: "Some text" },
        num: { type: "number" },
        flag: { type: "boolean" },
        pick: { type: "string", enum: ["a", "b"] },
        blob: { type: "object" },
      },
    };
    const { container } = render(<SchemaForm schema={schema} onSubmit={() => {}} />);
    const w = createWrapper(container);
    expect(w.findAllInputs()).toHaveLength(2); // text + num
    expect(w.findCheckbox()).not.toBeNull();
    expect(w.findSelect()).not.toBeNull(); // enum wins over type: "string"
    expect(w.findTextarea()).not.toBeNull();
    expect(screen.getByText("Some text")).toBeInTheDocument();
  });

  it("blocks submit when a required field is empty", () => {
    const onSubmit = vi.fn();
    const schema: JsonSchema = { properties: { name: { type: "string" } }, required: ["name"] };
    const { container } = render(<SchemaForm schema={schema} onSubmit={onSubmit} />);
    submit(container);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("blocks submit on invalid JSON", () => {
    const onSubmit = vi.fn();
    const schema: JsonSchema = { properties: { blob: { type: "object" } } };
    const { container } = render(<SchemaForm schema={schema} onSubmit={onSubmit} />);
    createWrapper(container).findTextarea()!.setTextareaValue("{nope");
    submit(container);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Not valid JSON")).toBeInTheDocument();
  });

  it("submits serialized arguments", () => {
    const onSubmit = vi.fn();
    const schema: JsonSchema = { properties: { count: { type: "integer" } }, required: ["count"] };
    const { container } = render(<SchemaForm schema={schema} onSubmit={onSubmit} />);
    createWrapper(container).findInput()!.setInputValue("7");
    submit(container);
    expect(onSubmit).toHaveBeenCalledWith({ count: 7 });
  });

  it("says so when a tool takes no input, and still submits", () => {
    const onSubmit = vi.fn();
    const { container } = render(<SchemaForm schema={{ type: "object", properties: {} }} onSubmit={onSubmit} />);
    expect(screen.getByText("This tool takes no input.")).toBeInTheDocument();
    submit(container);
    expect(onSubmit).toHaveBeenCalledWith({});
  });
});
