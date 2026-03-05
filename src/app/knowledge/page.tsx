"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Database, FileText, FolderOpen, ChevronRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface KnowledgeFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  category: string;
}

const categoryColors: Record<string, string> = {
  general: "#00D4AA",
  "memory-architecture": "#7C3AED",
  openclaw: "#3B82F6",
  "quark-evolution": "#F59E0B",
};

export default function KnowledgePage() {
  const { data, loading } = useApi<{ files: KnowledgeFile[] }>("/api/knowledge");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const files = data?.files || [];
  const filtered = filterCategory === "all"
    ? files
    : files.filter((f) => f.category === filterCategory);

  const categories = [...new Set(files.map((f) => f.category))];

  const loadFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/knowledge?slug=${encodeURIComponent(filePath)}`);
      const json = await res.json();
      setFileContent(json.content || "No content");
    } catch {
      setFileContent("Error loading file");
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Database size={24} className="text-[#00D4AA]" />
            Knowledge Base
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">{files.length} documents indexed</p>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              filterCategory === "all"
                ? "bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/30"
                : "bg-white/5 text-[#94A3B8] hover:bg-white/10 border border-transparent"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                filterCategory === cat
                  ? "bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/30"
                  : "bg-white/5 text-[#94A3B8] hover:bg-white/10 border border-transparent"
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: categoryColors[cat] || "#94A3B8" }} />
              {cat}
              <span className="ml-1 opacity-60">{files.filter((f) => f.category === cat).length}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* File list */}
          <div className="col-span-4">
            <GlassCard className="max-h-[75vh] overflow-y-auto">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-white/5 rounded" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center py-8">No documents found</p>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((file) => {
                    const isSelected = selectedFile === file.path;
                    const color = categoryColors[file.category] || "#94A3B8";

                    return (
                      <button
                        key={file.path}
                        onClick={() => loadFile(file.path)}
                        className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected ? "bg-[#00D4AA]/10" : "hover:bg-white/5"
                        }`}
                      >
                        <FileText size={14} style={{ color }} className="shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs truncate ${isSelected ? "text-[#00D4AA]" : "text-[#F1F5F9]"}`}>
                            {file.name.replace(".md", "")}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-[#94A3B8]">
                              <FolderOpen size={8} className="inline mr-0.5" />
                              {file.category}
                            </span>
                            <span className="text-[9px] text-[#94A3B8]">
                              {Math.round(file.size / 1024)}KB
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={12} className="text-[#94A3B8]/30 shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Content viewer */}
          <div className="col-span-8">
            <GlassCard className="min-h-[75vh]">
              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
                  <Database size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">Select a document to view</p>
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
                    {fileContent}
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
