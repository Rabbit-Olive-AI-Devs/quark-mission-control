"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-full bg-[#00D4AA]/10 p-4">
          <Inbox size={32} className="text-[#00D4AA]" />
        </div>
        <h1 className="text-xl font-semibold text-[#F1F5F9]">Inbox</h1>
        <p className="max-w-md text-center text-sm text-[#64748B]">
          Pending decisions, unanswered comments, agent escalations, and stale items — all in one place. Coming soon.
        </p>
      </div>
    </AppShell>
  );
}
