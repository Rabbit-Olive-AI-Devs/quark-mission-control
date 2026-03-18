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
    (f) => f.type === "journal"
  ).length;

  const loadFile = useCallback(async (filePath: string) => {
    setSelectedPath(filePath);
    setLoadingContent(true);
    setMobileReaderOpen(true);

    try {
      const isKb = filePath.startsWith("knowledge-base/");

      // 1) Prefer filesystem catch-all (fast path in local mode)
      const apiPath = isKb ? `shared/${filePath}` : filePath;
      const direct = await fetch(
        `/api/knowledge/${apiPath.split("/").map(encodeURIComponent).join("/")}`
      );

      if (direct.ok) {
        const json = await direct.json();
        setFileContent(json.content || "No content");
        return;
      }

      // 2) Remote/snapshot fallback for KB files
      if (isKb) {
        const kbFallback = await fetch(
          `/api/knowledge?slug=${encodeURIComponent(filePath)}`
        );
        if (kbFallback.ok) {
          const json = await kbFallback.json();
          setFileContent(json.content || "No content available");
          return;
        }
      }

      // 3) Legacy fallback for memory files
      const memFallback = await fetch(`/api/memory?slug=${encodeURIComponent(filePath)}`);
      const json = await memFallback.json();
      setFileContent(json.content || "No content");
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
