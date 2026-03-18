import { AppShell } from "@/components/layout/app-shell";
import { ContentPerformancePage } from "@/components/content-performance/ContentPerformancePage";
import { RefreshButton } from "@/components/content-performance/RefreshButton";
import { readAuditEvents, type ContentPerformanceAuditEvent } from "@/lib/content-performance/audit-log";
import { contentPerformanceService, loadServiceSources } from "@/lib/content-performance/service";

export default async function ContentPerformanceRoute() {
  const dto = contentPerformanceService.getPageData(loadServiceSources());

  let auditEvents: ContentPerformanceAuditEvent[] = [];
  try {
    auditEvents = readAuditEvents();
  } catch (error) {
    console.error("Failed to read content performance audit events", error);
  }

  return (
    <AppShell>
      <div className="mb-3 flex justify-end">
        <RefreshButton />
      </div>
      <ContentPerformancePage
        dataset={[dto.counts]}
        lastRefresh={dto.meta.refreshedAt}
        stale={dto.meta.stale}
        lastSuccessAt={dto.meta.lastSuccessAt}
        auditEvents={auditEvents}
      />
    </AppShell>
  );
}
