"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Monitor, Cpu, HardDrive, Clock, Globe, Zap, Shield, Info } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { SystemInfo, CommandCenterData } from "@/lib/parsers/types";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function SettingsPage() {
  const { data: system } = useApi<SystemInfo>("/api/system", ["heartbeat"]);
  const { data: cc } = useApi<CommandCenterData>("/api/command-center", ["metrics"]);

  const modelChain = cc
    ? [{ name: cc.primaryModel, role: "Primary" }, ...cc.fallbackChain.map((m, i) => ({ name: m, role: `Fallback ${i + 1}` }))]
    : [];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Info size={24} className="text-[#00D4AA]" />
            System Info
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">System configuration and information</p>
        </div>

        {/* System Info */}
        <GlassCard className="mb-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Monitor size={16} className="text-[#00D4AA]" />
            System Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Cpu size={14} className="text-[#94A3B8]" />
                <div>
                  <div className="text-xs text-[#94A3B8]">CPU Usage</div>
                  <div className="text-sm text-[#F1F5F9]">{system?.cpuPercent ?? "—"}%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive size={14} className="text-[#94A3B8]" />
                <div>
                  <div className="text-xs text-[#94A3B8]">Memory</div>
                  <div className="text-sm text-[#F1F5F9]">
                    {system ? `${(system.memoryUsedMb / 1024).toFixed(1)} / ${(system.memoryTotalMb / 1024).toFixed(1)} GB` : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <HardDrive size={14} className="text-[#94A3B8]" />
                <div>
                  <div className="text-xs text-[#94A3B8]">Disk</div>
                  <div className="text-sm text-[#F1F5F9]">
                    {system ? `${system.diskUsedGb} / ${system.diskTotalGb} GB` : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-[#94A3B8]" />
                <div>
                  <div className="text-xs text-[#94A3B8]">Uptime</div>
                  <div className="text-sm text-[#F1F5F9]">{system ? formatUptime(system.uptime) : "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Workspace */}
        <GlassCard delay={0.05} className="mb-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Globe size={16} className="text-[#7C3AED]" />
            Workspace
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-[#94A3B8]">Path</span>
              <span className="text-[#F1F5F9] font-mono">{process.env.NEXT_PUBLIC_WORKSPACE_PATH || "~/.openclaw/workspace"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-[#94A3B8]">Host</span>
              <span className="text-[#F1F5F9]">{system ? `${system.cpuPercent !== undefined ? "Connected" : "Unknown"}` : "Loading..."}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-[#94A3B8]">Primary Model</span>
              <span className="text-[#F1F5F9] font-mono text-[10px]">{cc?.primaryModel || "Loading..."}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#94A3B8]">Dashboard Version</span>
              <span className="text-[#F1F5F9]">{process.env.NEXT_PUBLIC_VERSION || "1.0.0"}</span>
            </div>
          </div>
        </GlassCard>

        {/* Model Configuration */}
        <GlassCard delay={0.1} className="mb-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Zap size={16} className="text-[#F59E0B]" />
            Model Fallback Chain
          </h3>
          {modelChain.length === 0 ? (
            <div className="animate-pulse h-20 bg-white/5 rounded" />
          ) : (
            <div className="space-y-2">
              {modelChain.map((model, i) => (
                <div
                  key={model.name}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                    i === 0 ? "bg-[#00D4AA]/5 border border-[#00D4AA]/20" : "bg-white/[0.02]"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? "bg-[#00D4AA]/20 text-[#00D4AA]" : "bg-white/10 text-[#94A3B8]"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#F1F5F9] font-mono">{model.name}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    i === 0
                      ? "bg-[#00D4AA]/10 text-[#00D4AA]"
                      : "bg-white/5 text-[#94A3B8]"
                  }`}>
                    {model.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Security */}
        <GlassCard delay={0.15}>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Shield size={16} className="text-[#EF4444]" />
            Security
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-[#94A3B8]">Auth Method</span>
              <span className="text-[#F1F5F9]">Cookie-based password</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-[#94A3B8]">Session Duration</span>
              <span className="text-[#F1F5F9]">7 days</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#94A3B8]">Remote Access</span>
              <span className="text-[#F1F5F9]">Tailscale Funnel</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
