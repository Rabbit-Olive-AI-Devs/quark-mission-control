import { GlassCard } from "@/components/ui/glass-card";

export function ContentPerformanceSkeleton() {
  return (
    <div className="space-y-4" aria-label="content-performance-loading">
      {[1, 2, 3].map((item) => (
        <GlassCard key={item}>
          <div className="h-24 animate-pulse rounded-lg bg-white/5" />
        </GlassCard>
      ))}
    </div>
  );
}
