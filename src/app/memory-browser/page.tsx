"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { BookOpen, Search, FileText, Calendar, Beaker, File, ChevronRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { MemoryFile } from "@/lib/parsers/memory";

interface SearchResult {
  file: string;
  line: number;
  content: string;
  context: string;
}

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

function JournalTimeline({ files }: { files: MemoryFile[] }) {
  const sessions = files.filter((f) => f.type === "session").slice(0, 30);

  // Group by month
  const months: Record<string, MemoryFile[]> = {};
  for (const f of sessions) {
    const month = f.name.slice(0, 7); // YYYY-MM
    if (!months[month]) months[month] = [];
    months[month].push(f);
  }

  return (
    <GlassCard delay={0.1}>
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Calendar size={14} className="text-[#00D4AA]" />
        Session Timeline
      </h3>
      <div className="space-y-3">
        {Object.entries(months).map(([month, mFiles]) => (
          <div key={month}>
            <div className="text-xs text-[#94A3B8] mb-1.5 font-medium">{month}</div>
            <div className="flex flex-wrap gap-1">
              {mFiles.map((f) => {
                const day = f.name.slice(8, 10);
                const sizeKb = Math.round(f.size / 1024);
                // Color intensity based on file size (activity level)
                const intensity = Math.min(1, sizeKb / 20);
                return (
                  <div
                    key={f.name}
                    title={`${f.name} — ${sizeKb}KB`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] cursor-pointer hover:ring-1 hover:ring-[#00D4AA]/50 transition-all"
                    style={{
                      background: `rgba(0, 212, 170, ${0.05 + intensity * 0.3})`,
                      color: intensity > 0.3 ? "#F1F5F9" : "#94A3B8",
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default function MemoryBrowserPage() {
  const { data, loading } = useApi<{ files: MemoryFile[] }>("/api/memory");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const files = data?.files || [];
  const filtered = filterType === "all"
    ? files
    : files.filter((f) => f.type === filterType);

  const doSearch = useCallback(async () => {
    if (search.length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
      const json = await res.json();
      setSearchResults(json.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [search]);

  const loadFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoadingContent(true);
    setSearchResults(null);
    try {
      const res = await fetch(`/api/memory?slug=${encodeURIComponent(filePath)}`);
      const json = await res.json();
      setFileContent(json.content || "No content");
    } catch {
      setFileContent("Error loading file");
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  // Highlight search term in content
  const highlightContent = (text: string) => {
    if (!search || search.length < 2) return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(regex, ">>>$1<<<");
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <BookOpen size={24} className="text-[#00D4AA]" />
            Memory Browser
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">{files.length} files indexed</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Full-text search across all memory files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D4AA]/50"
            />
          </div>
          <button
            onClick={doSearch}
            disabled={search.length < 2}
            className="px-4 py-2.5 rounded-xl bg-[#00D4AA] text-[#0A0A0F] text-sm font-medium hover:bg-[#00D4AA]/90 disabled:opacity-30 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-2 mb-4">
          {["all", "session", "research", "digest", "journal", "other"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                filterType === type
                  ? "bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/30"
                  : "bg-white/5 text-[#94A3B8] hover:bg-white/10 border border-transparent"
              }`}
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
              {type !== "all" && (
                <span className="ml-1 opacity-60">
                  {files.filter((f) => f.type === type).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search results */}
        {searchResults !== null && (
          <GlassCard className="mb-4">
            <h3 className="text-sm font-medium mb-3">
              Search Results: {searchResults.length} matches for &ldquo;{search}&rdquo;
            </h3>
            {searchLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-white/5 rounded" />)}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-4 text-center">No matches found</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => loadFile(r.file)}
                    className="w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight size={12} className="text-[#94A3B8] mt-1 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-[#00D4AA] font-mono">{r.file}:{r.line}</div>
                      <div className="text-xs text-[#F1F5F9] truncate">{r.content}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* File list + timeline */}
          <div className="col-span-3 space-y-4">
            <GlassCard className="max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-white/5 rounded" />)}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((file) => {
                    const Icon = typeIcons[file.type] || File;
                    const color = typeColors[file.type] || "#94A3B8";
                    const isSelected = selectedFile === file.path;

                    return (
                      <button
                        key={file.path}
                        onClick={() => loadFile(file.path)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                          isSelected ? "bg-[#00D4AA]/10 text-[#00D4AA]" : "hover:bg-white/5 text-[#F1F5F9]"
                        }`}
                      >
                        <Icon size={14} style={{ color }} className="shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-[9px] text-[#94A3B8] ml-auto shrink-0">
                          {Math.round(file.size / 1024)}KB
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Journal timeline */}
            {!loading && <JournalTimeline files={files} />}
          </div>

          {/* Content viewer */}
          <div className="col-span-9">
            <GlassCard className="min-h-[70vh]">
              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
                  <BookOpen size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">Select a file or search to view content</p>
                </div>
              ) : loadingContent ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-white/5 rounded" />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                    <FileText size={14} className="text-[#00D4AA]" />
                    <span className="text-xs font-mono text-[#00D4AA]">{selectedFile}</span>
                  </div>
                  <pre className="text-xs text-[#F1F5F9] whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[60vh]">
                    {search && search.length >= 2
                      ? highlightContent(fileContent || "").split(/(>>>|<<<)/g).map((part, i) => {
                          if (part === ">>>" || part === "<<<") return null;
                          // Check if previous delimiter was >>>
                          const fullText = highlightContent(fileContent || "");
                          const beforeThis = fullText.indexOf(part);
                          const isHighlighted = beforeThis >= 3 && fullText.slice(beforeThis - 3, beforeThis) === ">>>";
                          return isHighlighted ? (
                            <mark key={i} className="bg-[#00D4AA]/30 text-[#F1F5F9] rounded px-0.5">{part}</mark>
                          ) : (
                            <span key={i}>{part}</span>
                          );
                        })
                      : fileContent}
                  </pre>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
