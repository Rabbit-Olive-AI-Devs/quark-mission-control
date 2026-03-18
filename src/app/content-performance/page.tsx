import { AppShell } from "@/components/layout/app-shell";
import { ContentPerformancePage } from "@/components/content-performance/ContentPerformancePage";
import { readAuditEvents } from "@/lib/content-performance/audit-log";

export default async function ContentPerformanceRoute() {
  let auditEvents = [];

  try {
    auditEvents = readAuditEvents();
  } catch (error) {
    console.error("Failed to read content performance audit events", error);
    auditEvents = [];
  }

  return (
    <AppShell>
      <ContentPerformancePage dataset={[]} auditEvents={auditEvents} />
    </AppShell>
  );
}
