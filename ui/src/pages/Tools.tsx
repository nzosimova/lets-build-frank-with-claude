import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useEffect, useState } from "react";
import { SchemaForm } from "../components/SchemaForm";
import type { FrankClient, ToolInfo, ToolOutcome } from "../frank/client";

export function Tools({ client }: { client: FrankClient }) {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<ToolInfo>();
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<ToolOutcome>();

  useEffect(() => {
    client
      .listTools()
      .then(setTools)
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, [client]);

  const run = async (args: Record<string, unknown>) => {
    if (!selected) return;
    setRunning(true);
    setOutcome(undefined);
    try {
      setOutcome(await client.callTool(selected.name, args));
    } catch (error) {
      setOutcome({ isError: true, summary: error instanceof Error ? error.message : String(error) });
    } finally {
      setRunning(false);
    }
  };

  if (loadError) {
    return (
      <Alert type="error" header="Frank did not answer">
        {loadError}
      </Alert>
    );
  }

  return (
    <SpaceBetween size="l">
      <Table
        header={<Header counter={`(${tools.length})`}>Tools</Header>}
        loading={loading}
        loadingText="Discovering Frank's tools"
        items={tools}
        trackBy="name"
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        onSelectionChange={({ detail }) => {
          setSelected(detail.selectedItems[0]);
          setOutcome(undefined);
        }}
        columnDefinitions={[
          { id: "name", header: "Name", cell: (t) => t.name },
          { id: "description", header: "Description", cell: (t) => t.description ?? "" },
        ]}
        empty={<Box textAlign="center">Frank exposes no tools.</Box>}
      />

      {selected && (
        <Container header={<Header variant="h2" description={selected.description}>{selected.name}</Header>}>
          <SpaceBetween size="l">
            {/* keyed so switching tools resets the form */}
            <SchemaForm key={selected.name} schema={selected.inputSchema} submitting={running} onSubmit={run} />
            {outcome?.isError && (
              <Alert type="error" header={`${selected.name} failed`}>
                {outcome.summary}
              </Alert>
            )}
            {outcome && !outcome.isError && (
              <SpaceBetween size="s">
                <Box variant="h3">{outcome.summary}</Box>
                <Box variant="code">
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(outcome.structured ?? {}, null, 2)}
                  </pre>
                </Box>
              </SpaceBetween>
            )}
          </SpaceBetween>
        </Container>
      )}
    </SpaceBetween>
  );
}
