import AppLayout from "@cloudscape-design/components/app-layout";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { useState } from "react";
import type { FrankClient } from "./frank/client";
import { Overview } from "./pages/Overview";
import { Tools } from "./pages/Tools";

export type PageId = "overview" | "tools";

const pages: Record<PageId, string> = { overview: "Overview", tools: "Tools" };

export interface AppProps {
  client: FrankClient;
  initialPage?: PageId;
}

export function App({ client, initialPage = "overview" }: AppProps) {
  const [page, setPage] = useState<PageId>(initialPage);

  return (
    <AppLayout
      toolsHide
      navigation={
        <SideNavigation
          header={{ text: "Frank", href: "#overview" }}
          activeHref={`#${page}`}
          items={(Object.keys(pages) as PageId[]).map((id) => ({ type: "link", text: pages[id], href: `#${id}` }))}
          onFollow={(event) => {
            event.preventDefault();
            const id = event.detail.href.slice(1);
            if (id in pages) setPage(id as PageId);
          }}
        />
      }
      content={
        <ContentLayout header={<Header variant="h1">{pages[page]}</Header>}>
          {page === "overview" ? <Overview client={client} /> : <Tools client={client} />}
        </ContentLayout>
      }
    />
  );
}
