"use client";

import { useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/hooks/use-api";
import { TabBar, type KnowledgeTab } from "@/components/knowledge/tab-bar";
import { FileList } from "@/components/knowledge/file-list";
import { ReaderPane } from "@/components/knowledge/reader-pane";
import { Search } from "lucide-react";

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

export function ExploreKnowledge() {
  const { data: memData, loading: memLoading } = useApi<{
    files: MemoryFile[];
  }>("/api/memory");
  const { data: kbData, loading: kbLoading } = useApi<{
    files: KnowledgeFile[];
  }>("/api/knowledge");

  const [tab, setTab] = useState<KnowledgeTab>("journals");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);
  const [search, setSearch] = useState("");

  const memoryFiles = memData?.files || [];
  const kbFiles = kbData?.files || [];

  // Search filter
  const filteredMemory = search
    ? memoryFiles.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
      )
    : memoryFiles;
  const filteredKb = search
    ? kbFiles.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
      )
    : kbFiles;

  // Counts for tab badges
  const journalCount = filteredMemory.filter(
    (f) => f.type === "journal"
  ).length;

  const totalFiles = filteredMemory.length + filteredKb.length;

  const loadFile = useCallback(async (filePath: string) => {
    setSelectedPath(filePath);
    setLoadingContent(true);
    setMobileReaderOpen(true);

    try {
      const isKb = filePath.startsWith("knowledge-base/");
      const apiPath = isKb ? `shared/${filePath}` : filePath;
      const direct = await fetch(
        `/api/knowledge/${apiPath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`
      );

      if (direct.ok) {
        const json = await direct.json();
        setFileContent(json.content || "No content");
        return;
      }

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

      const memFallback = await fetch(
        `/api/memory?slug=${encodeURIComponent(filePath)}`
      );
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
  };

  const isListLoading = tab === "knowledge-base" ? kbLoading : memLoading;

  return (
    <div>
      {/* Subtitle */}
      <p className="text-sm text-[#94A3B8] mb-4">
        {totalFiles} files across memory and knowledge base
      </p>

      {/* Search input */}
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
        />
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:border-[#00D4AA]/50 focus:outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <TabBar
          active={tab}
          onChange={handleTabChange}
          counts={{
            journals: journalCount,
            memory: filteredMemory.length,
            kb: filteredKb.length,
          }}
        />
      </div>

      {/* Split view */}
      <div className="flex gap-4">
        {!expanded && (
          <div
            className={`w-[300px] shrink-0 ${
              mobileReaderOpen ? "hidden md:block" : "block"
            }`}
          >
            <GlassCard className="max-h-[75vh] overflow-y-auto">
              <FileList
                tab={tab}
                memoryFiles={filteredMemory}
                kbFiles={filteredKb}
                loading={isListLoading}
                selectedPath={selectedPath}
                onSelect={loadFile}
              />
            </GlassCard>
          </div>
        )}

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
  );
}
