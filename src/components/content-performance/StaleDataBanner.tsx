import { AlertTriangle } from "lucide-react";

interface StaleDataBannerProps {
  stale: boolean;
  lastSuccessAt?: string | null;
}

export function StaleDataBanner({ stale, lastSuccessAt }: StaleDataBannerProps) {
  if (!stale) return null;

  return (
    <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
      <AlertTriangle size={14} />
      <span>Data may be stale.</span>
      {lastSuccessAt ? <span className="text-amber-100/80">Last success: {lastSuccessAt}</span> : null}
    </div>
  );
}
