"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Table, Activity, Globe } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: "posts", label: "Post Performance", icon: Table },
  { id: "outbound", label: "Outbound Activity", icon: Activity },
  { id: "health", label: "Platform Health", icon: Globe },
];

interface Props {
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
}

export function DetailTabs({ children }: Props) {
  const [activeTab, setActiveTab] = useState("posts");

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-white/[0.03] rounded-lg p-1 border border-white/5">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors flex-1 justify-center cursor-pointer"
              style={{
                color: isActive ? "#F1F5F9" : "#94A3B8",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-bg"
                  className="absolute inset-0 rounded-md bg-white/[0.08] border border-white/10"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <Icon size={14} className="relative z-10" />
              <span className="relative z-10 hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children[activeIndex]}
      </motion.div>
    </div>
  );
}
