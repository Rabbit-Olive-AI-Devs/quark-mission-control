"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import type { LucideIcon } from "lucide-react";

interface InboxSectionProps {
  title: string;
  icon: LucideIcon;
  count: number;
  color: string;
  emptyMessage: string;
  delay?: number;
  children: ReactNode;
}

export function InboxSection({ title, icon: Icon, count, color, emptyMessage, delay = 0, children }: InboxSectionProps) {
  const [open, setOpen] = useState(count > 0);

  return (
    <GlassCard delay={delay}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 text-left"
      >
        <Icon size={16} style={{ color }} />
        <span className="text-sm font-medium text-[#F1F5F9] flex-1">{title}</span>
        {count > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {count}
          </span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-[#94A3B8]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/5">
              {count === 0 ? (
                <p className="text-xs text-[#94A3B8] py-2 text-center">{emptyMessage}</p>
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
