import { AppShell } from "@/components/layout/app-shell";
import { ContentPerformancePage } from "@/components/content-performance/ContentPerformancePage";
import { readAuditEvents } from "@/lib/content-performance/audit-log";

export default async function ContentPerformanceRoute() {
  const auditEvents = readAuditEvents();

  return (
    <AppShell>
      <ContentPerformancePage dataset={[]} auditEvents={auditEvents} />
    </AppShell>
  );
}
