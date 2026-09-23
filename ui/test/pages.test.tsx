import createWrapper from "@cloudscape-design/components/test-utils/dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import type { FrankClient } from "../src/frank/client";

const fakeClient = (overrides: Partial<FrankClient> = {}): FrankClient => ({
  getStatus: vi.fn().mockResolvedValue({
    summary: "Frank 1.2.3 is up",
    version: "1.2.3",
    uptimeSeconds: 42,
    greeting: "Hi, I'm Frank.",
  }),
  listTools: vi.fn().mockResolvedValue([
    {
      name: "get_status",
      description: "Returns Frank's version.",
      inputSchema: { type: "object", properties: {} },
    },
  ]),
  callTool: vi.fn().mockResolvedValue({
    isError: false,
    summary: "Frank 1.2.3 is up",
    structured: { summary: "Frank 1.2.3 is up", version: "1.2.3" },
  }),
  ...overrides,
});

describe("Overview", () => {
  it("shows Frank's status", async () => {
    render(<App client={fakeClient()} />);
    expect(await screen.findByText("1.2.3")).toBeInTheDocument();
    expect(screen.getByText("42s")).toBeInTheDocument();
    expect(screen.getByText("Hi, I'm Frank.")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("says Frank did not answer when the call fails, and can retry", async () => {
    const getStatus = vi.fn().mockRejectedValueOnce(new Error("fetch failed"));
    getStatus.mockResolvedValueOnce({ summary: "", version: "1.2.3", uptimeSeconds: 1, greeting: "hi" });
    render(<App client={fakeClient({ getStatus })} />);
    expect(await screen.findByText("Frank did not answer")).toBeInTheDocument();
    expect(screen.getByText("fetch failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("1.2.3")).toBeInTheDocument();
  });
});

describe("Tools", () => {
  it("lists tools, runs the selected one, and shows the result", async () => {
    const client = fakeClient();
    const { container } = render(<App client={client} initialPage="tools" />);
    expect(await screen.findByText("Returns Frank's version.")).toBeInTheDocument();

    const table = createWrapper(container).findTable()!;
    table.findRowSelectionArea(1)!.click();

    fireEvent.submit(await waitFor(() => container.querySelector("form")!));
    await waitFor(() => expect(client.callTool).toHaveBeenCalledWith("get_status", {}));
    expect(await screen.findByText("Frank 1.2.3 is up")).toBeInTheDocument();
    expect(screen.getByText(/"version": "1.2.3"/)).toBeInTheDocument();
  });

  it("shows a tool error as an error, not a result", async () => {
    const client = fakeClient({
      callTool: vi.fn().mockResolvedValue({ isError: true, summary: "get_status could not complete." }),
    });
    const { container } = render(<App client={client} initialPage="tools" />);
    await screen.findByText("Returns Frank's version.");
    createWrapper(container).findTable()!.findRowSelectionArea(1)!.click();
    fireEvent.submit(await waitFor(() => container.querySelector("form")!));
    expect(await screen.findByText("get_status failed")).toBeInTheDocument();
    expect(screen.getByText("get_status could not complete.")).toBeInTheDocument();
  });
});
