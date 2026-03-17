"use client";

import { FileText, Maximize2, Minimize2, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface ReaderPaneProps {
  filePath: string | null;
  content: string | null;
  loading: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Mobile: show back button instead of collapse */
  onBack?: () => void;
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-3 p-2">
      <div className="h-4 bg-white/5 rounded w-2/3" />
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-5/6" />
      <div className="h-3 bg-white/5 rounded w-4/6" />
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-3/4" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
      <FileText size={32} className="mb-3 opacity-20" />
      <p className="text-sm">Select a file to read</p>
      <p className="text-[10px] mt-1 opacity-50">
        Use the file list or switch tabs to browse
      </p>
    </div>
  );
}

export function ReaderPane({
  filePath,
  content,
  loading,
  expanded,
  onToggleExpand,
  onBack,
}: ReaderPaneProps) {
  if (!filePath) {
    return (
      <GlassCard className="min-h-[70vh] flex items-center justify-center">
        <EmptyState />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="min-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors mr-1"
            title="Back to file list"
          >
            <ArrowLeft size={14} className="text-[#94A3B8]" />
          </button>
        )}
        <FileText size={14} className="text-[#00D4AA] shrink-0" />
        <span className="text-xs font-mono text-[#00D4AA] truncate flex-1">
          {filePath}
        </span>
        <button
          onClick={onToggleExpand}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors hidden md:block"
          title={expanded ? "Collapse reader" : "Expand reader"}
        >
          {expanded ? (
            <Minimize2 size={14} className="text-[#94A3B8]" />
          ) : (
            <Maximize2 size={14} className="text-[#94A3B8]" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <LoadingState />
        ) : (
          <pre className="text-xs text-[#F1F5F9] whitespace-pre-wrap font-mono leading-relaxed">
            {content || "No content"}
          </pre>
        )}
      </div>
    </GlassCard>
  );
}
