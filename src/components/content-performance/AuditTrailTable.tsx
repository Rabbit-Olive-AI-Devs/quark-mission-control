import type { ContentPerformanceAuditEvent } from "@/lib/content-performance/audit-log";
import { GlassCard } from "@/components/ui/glass-card";

interface AuditTrailTableProps {
  events: ContentPerformanceAuditEvent[];
}

export function AuditTrailTable({ events }: AuditTrailTableProps) {
  return (
    <GlassCard className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Audit Trail</h2>
        <span className="text-[11px] text-[#94A3B8]">Append-only JSONL</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#94A3B8]">
          <thead>
            <tr className="border-b border-white/10 text-[#F1F5F9]">
              <th className="py-2 pr-3">Timestamp</th>
              <th className="py-2 pr-3">Event</th>
              <th className="py-2 pr-3">Score</th>
              <th className="py-2 pr-3">Parser</th>
              <th className="py-2 pr-3">Details</th>
              <th className="py-2">Actor</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={`${event.timestamp}-${event.eventType}-${event.actor}`} className="border-b border-white/5">
                <td className="py-2 pr-3">{event.timestamp}</td>
                <td className="py-2 pr-3">{event.eventType}</td>
                <td className="py-2 pr-3">{event.scoreVersion}</td>
                <td className="py-2 pr-3">{event.parserVersion}</td>
                <td className="py-2 pr-3">{event.details}</td>
                <td className="py-2">{event.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
