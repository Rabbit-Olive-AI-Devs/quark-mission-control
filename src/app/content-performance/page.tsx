import { AppShell } from "@/components/layout/app-shell";
import { ContentPerformancePage } from "@/components/content-performance/ContentPerformancePage";

export default async function ContentPerformanceRoute() {
  return (
    <AppShell>
      <ContentPerformancePage dataset={[]} />
    </AppShell>
  );
}
