"use client";

import { useState, useEffect } from "react";
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
  Database,
  BarChart3,
  Calendar,
  Settings,
  Menu,
  X,
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
  { href: "/knowledge", label: "Knowledge Base", icon: Database },
  { href: "/metrics-page", label: "Metrics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const connected = useDashboardStore((s) => s.connected);
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 md:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-[#F1F5F9]" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-60 h-screen fixed left-0 top-0 z-50 glass-card border-r border-white/5 rounded-none flex flex-col transition-transform duration-300 ease-in-out",
          "md:translate-x-0 md:z-40",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + mobile close */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00D4AA]/20 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[#00D4AA] pulse-live" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#F1F5F9] tracking-wide">Q.U.A.R.K.</h1>
                <p className="text-[9px] text-[#94A3B8] leading-tight">Quick Utility for Automation,<br/>Research & Knowledge</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 md:hidden"
              aria-label="Close menu"
            >
              <X size={18} className="text-[#94A3B8]" />
            </button>
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
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <StatusDot status={connected ? "active" : "idle"} size="sm" pulse={connected} />
            <span>{connected ? "Live" : "Disconnected"}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
