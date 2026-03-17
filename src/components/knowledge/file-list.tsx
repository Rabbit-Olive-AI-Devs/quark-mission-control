"use client";

import { useState } from "react";
import {
  FileText,
  Calendar,
  Beaker,
  BookOpen,
  File,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { KnowledgeTab } from "./tab-bar";

// ---- Memory file types ----
interface MemoryFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: "session" | "research" | "journal" | "digest" | "other";
}

interface KnowledgeFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  category: string;
}

// ---- Helpers ----
const typeIcons: Record<string, typeof FileText> = {
  session: Calendar,
  research: Beaker,
  journal: BookOpen,
  digest: FileText,
  other: File,
};

const typeColors: Record<string, string> = {
  session: "#00D4AA",
  research: "#7C3AED",
  journal: "#F59E0B",
  digest: "#3B82F6",
  other: "#94A3B8",
};

const categoryColors: Record<string, string> = {
  general: "#00D4AA",
  "memory-architecture": "#7C3AED",
  openclaw: "#3B82F6",
  "quark-evolution": "#F59E0B",
  interests: "#EC4899",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function getFirstLine(name: string): string {
  // Extract date from journal-style filenames
  const match = name.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  if (match) return match[1];
  return name.replace(".md", "");
}

// ---- Skeleton ----
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-10 bg-white/5 rounded-lg" />
      ))}
    </div>
  );
}

// ---- File row ----
function FileRow({
  name,
  subtitle,
  icon: Icon,
  iconColor,
  sizeKb,
  isSelected,
  onClick,
}: {
  name: string;
  subtitle?: string;
  icon: typeof FileText;
  iconColor: string;
  sizeKb: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
        isSelected ? "bg-[#00D4AA]/10" : "hover:bg-white/5"
      }`}
    >
      <Icon size={14} style={{ color: iconColor }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div
          className={`text-xs truncate ${isSelected ? "text-[#00D4AA]" : "text-[#F1F5F9]"}`}
        >
          {name}
        </div>
        {subtitle && (
          <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      <span className="text-[9px] text-[#94A3B8] shrink-0">{sizeKb}KB</span>
    </button>
  );
}

// ---- Journals tab ----
function JournalsList({
  files,
  selectedPath,
  onSelect,
}: {
  files: MemoryFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  // Only journal-type (YYYY-MM-DD.md) and session files, sorted newest first
  const journals = files
    .filter((f) => f.type === "session" || f.type === "journal")
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  if (journals.length === 0) {
    return (
      <p className="text-xs text-[#94A3B8] text-center py-8">No journal entries found</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {journals.map((f) => (
        <FileRow
          key={f.path}
          name={getFirstLine(f.name)}
          subtitle={formatDate(f.modified)}
          icon={Calendar}
          iconColor="#00D4AA"
          sizeKb={Math.round(f.size / 1024)}
          isSelected={selectedPath === f.path}
          onClick={() => onSelect(f.path)}
        />
      ))}
    </div>
  );
}

// ---- Memory tab ----
function MemoryList({
  files,
  selectedPath,
  onSelect,
}: {
  files: MemoryFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const typeOrder = ["session", "research", "journal", "digest", "other"] as const;

  // Group by type
  const grouped: Record<string, MemoryFile[]> = {};
  for (const f of files) {
    if (!grouped[f.type]) grouped[f.type] = [];
    grouped[f.type].push(f);
  }

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (t: string) =>
    setCollapsed((prev) => ({ ...prev, [t]: !prev[t] }));

  return (
    <div className="space-y-2">
      {typeOrder.map((type) => {
        const group = grouped[type];
        if (!group || group.length === 0) return null;
        const isCollapsed = collapsed[type];
        const Icon = typeIcons[type] || File;
        const color = typeColors[type] || "#94A3B8";

        return (
          <div key={type}>
            <button
              onClick={() => toggle(type)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
              <Icon size={12} style={{ color }} />
              <span className="font-medium capitalize">{type}</span>
              <span className="text-[10px] opacity-50">{group.length}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5 ml-2">
                {[...group].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()).map((f) => (
                  <FileRow
                    key={f.path}
                    name={f.name.replace(".md", "")}
                    subtitle={formatDate(f.modified)}
                    icon={Icon}
                    iconColor={color}
                    sizeKb={Math.round(f.size / 1024)}
                    isSelected={selectedPath === f.path}
                    onClick={() => onSelect(f.path)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Knowledge Base tab (tree view) ----
function KBTreeView({
  files,
  selectedPath,
  onSelect,
}: {
  files: KnowledgeFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Group by category
  const grouped: Record<string, KnowledgeFile[]> = {};
  for (const f of files) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }

  const categories = Object.keys(grouped).sort();

  const toggle = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  if (files.length === 0) {
    return (
      <p className="text-xs text-[#94A3B8] text-center py-8">No knowledge base files found</p>
    );
  }

  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const catFiles = grouped[cat];
        const isCollapsed = collapsed[cat];
        const color = categoryColors[cat] || "#94A3B8";

        return (
          <div key={cat}>
            <button
              onClick={() => toggle(cat)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.03] transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
              <FolderOpen size={12} style={{ color }} />
              <span className="font-medium">{cat}</span>
              <span className="text-[10px] opacity-50">{catFiles.length}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5 ml-2">
                {[...catFiles].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()).map((f) => (
                  <FileRow
                    key={f.path}
                    name={f.name.replace(".md", "")}
                    subtitle={`${cat} · ${Math.round(f.size / 1024)}KB`}
                    icon={FileText}
                    iconColor={color}
                    sizeKb={Math.round(f.size / 1024)}
                    isSelected={selectedPath === f.path}
                    onClick={() => onSelect(f.path)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Main export ----
interface FileListProps {
  tab: KnowledgeTab;
  memoryFiles: MemoryFile[];
  kbFiles: KnowledgeFile[];
  loading: boolean;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileList({
  tab,
  memoryFiles,
  kbFiles,
  loading,
  selectedPath,
  onSelect,
}: FileListProps) {
  if (loading) return <LoadingSkeleton />;

  switch (tab) {
    case "journals":
      return (
        <JournalsList
          files={memoryFiles}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      );
    case "memory":
      return (
        <MemoryList
          files={memoryFiles}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      );
    case "knowledge-base":
      return (
        <KBTreeView
          files={kbFiles}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      );
  }
}
