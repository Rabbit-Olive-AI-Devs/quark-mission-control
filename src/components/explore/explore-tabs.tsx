"use client";

import { BookOpen, Radio, Users } from "lucide-react";

export type ExploreTab = "knowledge" | "intel" | "agents";

interface ExploreTabsProps {
  counts: {
    knowledge: number;
    intel: number;
    agents: number;
  };
  activeTab: ExploreTab;
  onTabChange: (tab: ExploreTab) => void;
}

const TABS: Array<{ key: ExploreTab; label: string; icon: typeof BookOpen }> = [
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
  { key: "intel", label: "Intel", icon: Radio },
  { key: "agents", label: "Agents", icon: Users },
];

export function ExploreTabs({ counts, activeTab, onTabChange }: ExploreTabsProps) {
  return (
    <div className="flex gap-2">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key;
        const count = counts[key];
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
            }`}
          >
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-[#00D4AA]/30" : "bg-white/10"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
