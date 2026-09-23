import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useCallback, useEffect, useState } from "react";
import type { FrankClient, StatusInfo } from "../frank/client";

type State = { kind: "loading" } | { kind: "ok"; status: StatusInfo } | { kind: "error"; message: string };

export function Overview({ client }: { client: FrankClient }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(() => {
    setState({ kind: "loading" });
    client
      .getStatus()
      .then((status) => setState({ kind: "ok", status }))
      .catch((error: unknown) =>
        setState({ kind: "error", message: error instanceof Error ? error.message : String(error) }),
      );
  }, [client]);

  useEffect(load, [load]);

  if (state.kind === "error") {
    return (
      <Alert
        type="error"
        header="Frank did not answer"
        action={<Button onClick={load}>Retry</Button>}
      >
        {state.message}
      </Alert>
    );
  }

  return (
    <Container header={<Header variant="h2">Status</Header>}>
      {state.kind === "loading" ? (
        <StatusIndicator type="loading">Asking Frank…</StatusIndicator>
      ) : (
        <KeyValuePairs
          columns={2}
          items={[
            { label: "Connection", value: <StatusIndicator type="success">Connected</StatusIndicator> },
            { label: "Version", value: state.status.version },
            { label: "Uptime", value: `${state.status.uptimeSeconds}s` },
            { label: "Greeting", value: state.status.greeting },
          ]}
        />
      )}
    </Container>
  );
}
