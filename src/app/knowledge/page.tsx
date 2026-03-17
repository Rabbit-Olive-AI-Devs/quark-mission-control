"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { BookOpen } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { TabBar, type KnowledgeTab } from "@/components/knowledge/tab-bar";
import { FileList } from "@/components/knowledge/file-list";
import { ReaderPane } from "@/components/knowledge/reader-pane";

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

export default function KnowledgePage() {
  const { data: memData, loading: memLoading } = useApi<{ files: MemoryFile[] }>("/api/memory");
  const { data: kbData, loading: kbLoading } = useApi<{ files: KnowledgeFile[] }>("/api/knowledge");

  const [tab, setTab] = useState<KnowledgeTab>("journals");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Mobile: when a file is selected, show reader full-screen
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);

  const memoryFiles = memData?.files || [];
  const kbFiles = kbData?.files || [];

  // Counts for tab badges
  const journalCount = memoryFiles.filter(
    (f) => f.type === "session" || f.type === "journal"
  ).length;

  const loadFile = useCallback(async (filePath: string) => {
    setSelectedPath(filePath);
    setLoadingContent(true);
    setMobileReaderOpen(true);

    try {
      // KB files have paths like "knowledge-base/..." — need "shared/" prefix for the catch-all route.
      // Memory files have paths like "memory/..." — already valid for the catch-all route.
      const apiPath = filePath.startsWith("knowledge-base/")
        ? `shared/${filePath}`
        : filePath;
      const res = await fetch(
        `/api/knowledge/${apiPath.split("/").map(encodeURIComponent).join("/")}`
      );
      if (!res.ok) {
        // Fallback: try memory slug route (for legacy compat)
        const fallback = await fetch(
          `/api/memory?slug=${encodeURIComponent(filePath)}`
        );
        const json = await fallback.json();
        setFileContent(json.content || "No content");
      } else {
        const json = await res.json();
        setFileContent(json.content || "No content");
      }
    } catch {
      setFileContent("Error loading file");
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const handleBack = () => {
    setMobileReaderOpen(false);
  };

  const handleToggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const handleTabChange = (newTab: KnowledgeTab) => {
    setTab(newTab);
    // Don't clear selection on tab change so reader stays populated
  };

  const isListLoading = tab === "knowledge-base" ? kbLoading : memLoading;
  const totalFiles = memoryFiles.length + kbFiles.length;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <BookOpen size={24} className="text-[#00D4AA]" />
            Knowledge
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {totalFiles} files across memory and knowledge base
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <TabBar
            active={tab}
            onChange={handleTabChange}
            counts={{
              journals: journalCount,
              memory: memoryFiles.length,
              kb: kbFiles.length,
            }}
          />
        </div>

        {/* Split view */}
        <div className="flex gap-4">
          {/* File list — hidden on mobile when reader is open, or when expanded */}
          {!expanded && (
            <div
              className={`w-[300px] shrink-0 ${
                mobileReaderOpen ? "hidden md:block" : "block"
              }`}
            >
              <GlassCard className="max-h-[75vh] overflow-y-auto">
                <FileList
                  tab={tab}
                  memoryFiles={memoryFiles}
                  kbFiles={kbFiles}
                  loading={isListLoading}
                  selectedPath={selectedPath}
                  onSelect={loadFile}
                />
              </GlassCard>
            </div>
          )}

          {/* Reader pane */}
          <div
            className={`flex-1 min-w-0 ${
              !mobileReaderOpen && !selectedPath ? "hidden md:block" : "block"
            }`}
          >
            <ReaderPane
              filePath={selectedPath}
              content={fileContent}
              loading={loadingContent}
              expanded={expanded}
              onToggleExpand={handleToggleExpand}
              onBack={mobileReaderOpen ? handleBack : undefined}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
