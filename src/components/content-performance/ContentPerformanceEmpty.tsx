import { GlassCard } from "@/components/ui/glass-card";
import { Megaphone } from "lucide-react";

export function ContentPerformanceEmpty() {
  return (
    <GlassCard>
      <div className="py-16 text-center">
        <Megaphone size={40} className="mx-auto mb-4 text-[#94A3B8]/30" />
        <p className="text-sm text-[#94A3B8]">No content performance data yet.</p>
        <p className="mt-1 text-xs text-[#94A3B8]/60">Connect your data source to populate this view.</p>
      </div>
    </GlassCard>
  );
}
