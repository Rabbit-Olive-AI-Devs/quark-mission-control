import { Megaphone } from "lucide-react";
import { ContentPerformanceEmpty } from "./ContentPerformanceEmpty";
import { ContentPerformanceError } from "./ContentPerformanceError";
import { ContentPerformanceSkeleton } from "./ContentPerformanceSkeleton";

interface ContentPerformancePageProps {
  dataset?: unknown[] | null;
  error?: string | null;
  loading?: boolean;
  lastRefresh?: string;
}

export function ContentPerformancePage({
  dataset = null,
  error = null,
  loading = false,
  lastRefresh,
  auditEvents = [],
}: ContentPerformancePageProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-[#F1F5F9]">
            <Megaphone size={24} className="text-[#7C3AED]" />
            Content Performance
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Cinematic Ops view for content delivery and engagement outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="window-select" className="sr-only">
            Time window
          </label>
          <select
            id="window-select"
            defaultValue="7d"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#F1F5F9]"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-[#94A3B8]">
            Last refresh: {lastRefresh ?? "—"}
          </span>
        </div>
      </div>

      {loading ? (
        <ContentPerformanceSkeleton />
      ) : error ? (
        <ContentPerformanceError message={error} />
      ) : !dataset || dataset.length === 0 ? (
        <ContentPerformanceEmpty />
      ) : (
        <ContentPerformanceEmpty />
      )}

      <AuditTrailTable events={auditEvents} />
    </div>
  );
}

      )}
    </div>
  );
}
erformanceEmpty />
      ) : (
        <ContentPerformanceEmpty />
      )}
    </div>
  );
}
