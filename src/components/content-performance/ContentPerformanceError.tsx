import { GlassCard } from "@/components/ui/glass-card";
import { AlertTriangle } from "lucide-react";

interface ContentPerformanceErrorProps {
  message: string;
}

export function ContentPerformanceError({ message }: ContentPerformanceErrorProps) {
  return (
    <GlassCard>
      <div className="py-16 text-center">
        <AlertTriangle size={40} className="mx-auto mb-4 text-[#F59E0B]" />
        <p className="text-sm text-[#F1F5F9]">Unable to load content performance.</p>
        <p className="mt-1 text-xs text-[#94A3B8]">{message}</p>
      </div>
    </GlassCard>
  );
}
