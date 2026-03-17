"use client";

import { BookOpen, Brain, Database } from "lucide-react";

export type KnowledgeTab = "journals" | "memory" | "knowledge-base";

interface TabBarProps {
  active: KnowledgeTab;
  onChange: (tab: KnowledgeTab) => void;
  counts?: { journals: number; memory: number; kb: number };
}

const tabs: { id: KnowledgeTab; label: string; icon: typeof BookOpen }[] = [
  { id: "journals", label: "Journals", icon: BookOpen },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "knowledge-base", label: "Knowledge Base", icon: Database },
];

export function TabBar({ active, onChange, counts }: TabBarProps) {
  const countMap: Record<KnowledgeTab, number | undefined> = {
    journals: counts?.journals,
    memory: counts?.memory,
    "knowledge-base": counts?.kb,
  };

  return (
    <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        const count = countMap[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? "bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20"
                : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5 border border-transparent"
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
            {count !== undefined && (
              <span className={`text-[10px] ${isActive ? "text-[#00D4AA]/60" : "opacity-50"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
