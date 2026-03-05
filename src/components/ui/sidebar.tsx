"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  Activity,
  Users,
  FileText,
  Radio,
  BookOpen,
  BarChart3,
  Settings,
} from "lucide-react";
import { StatusDot } from "./status-dot";
import { useDashboardStore } from "@/stores/dashboard";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cron", label: "Cron Monitor", icon: Clock },
  { href: "/activity", label: "Activity Feed", icon: Activity },
  { href: "/agents", label: "Agent Network", icon: Users },
  { href: "/content", label: "Content Pipeline", icon: FileText },
  { href: "/intel", label: "Intel Feed", icon: Radio },
  { href: "/memory-browser", label: "Memory Browser", icon: BookOpen },
  { href: "/metrics-page", label: "Metrics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const connected = useDashboardStore((s) => s.connected);

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 z-40 glass-card border-r border-white/5 rounded-none flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00D4AA]/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#00D4AA]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#F1F5F9]">Quark</h1>
            <p className="text-[10px] text-[#94A3B8]">Mission Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                isActive
                  ? "bg-[#00D4AA]/10 text-[#00D4AA]"
                  : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <StatusDot status={connected ? "active" : "idle"} size="sm" pulse={connected} />
            <span>{connected ? "Live" : "Disconnected"}</span>
          </div>
          <Link href="/settings" className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
            <Settings size={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
