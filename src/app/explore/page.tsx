"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Compass } from "lucide-react";

export default function ExplorePage() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-full bg-[#00D4AA]/10 p-4">
          <Compass size={32} className="text-[#00D4AA]" />
        </div>
        <h1 className="text-xl font-semibold text-[#F1F5F9]">Explore</h1>
        <p className="max-w-md text-center text-sm text-[#64748B]">
          Knowledge browser, intel feed, and agent communications — your reference shelf. Coming soon.
        </p>
      </div>
    </AppShell>
  );
}
