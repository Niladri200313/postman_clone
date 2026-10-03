"use client";

import React, { useState, useCallback } from "react";
import { Clock, CheckCircle2, XCircle, Loader2, ArrowUpRight, Trash2, ChevronRight, ChevronDown, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequestPlaygroundStore, RequestTab } from "@/modules/request/store/useRequestStore";

// Per-tab history is stored in the Zustand playground store's responseViewerData
// We maintain a local request history list in this component using localStorage
const HISTORY_KEY = "postboy_request_history";

export type HistoryEntry = {
  id: string;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  duration?: number;
  timestamp: string;
  tabSnapshot?: Partial<RequestTab>;
};

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearHistory() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(HISTORY_KEY);
  }
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PUT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PATCH: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
};

const HistoryPanel = () => {
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { openRequestTab } = useRequestPlaygroundStore();

  React.useEffect(() => {
    const handleUpdate = () => {
      setHistory(loadHistory());
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("postboy:history_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("postboy:history_updated", handleUpdate);
    };
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const filteredHistory = history.filter(
    (entry) =>
      entry.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReplay = (entry: HistoryEntry) => {
    openRequestTab({
      id: `history_${entry.id}`,
      name: `${entry.method} ${entry.url.slice(0, 30)}`,
      method: entry.method,
      url: entry.url,
      ...(entry.tabSnapshot || {}),
    });
  };

  const getStatusColor = (status?: number) => {
    if (!status) return "text-zinc-500";
    if (status >= 500) return "text-red-400";
    if (status >= 400) return "text-amber-400";
    if (status >= 300) return "text-blue-400";
    return "text-emerald-400";
  };

  const formatTime = (ts: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
        hour12: false,
      }).format(new Date(ts));
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium">Request History</span>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
            {filteredHistory.length}
          </span>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-800 px-2"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div className="p-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter requests..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-2 px-4">
            <Clock className="w-8 h-8 text-zinc-700" />
            <p className="text-sm text-zinc-500">No history yet</p>
            <p className="text-xs text-zinc-600">
              Requests you send will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {[...filteredHistory].reverse().map((entry) => (
              <div key={entry.id} className="group">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() =>
                    setExpandedId(expandedId === entry.id ? null : entry.id)
                  }
                >
                  {expandedId === entry.id ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      METHOD_COLORS[entry.method] || "bg-zinc-800 text-zinc-300 border-zinc-700"
                    }`}
                  >
                    {entry.method}
                  </span>
                  <span className="text-xs text-zinc-300 truncate flex-1 min-w-0 font-mono">
                    {entry.url}
                  </span>
                  {entry.status && (
                    <span className={`text-[11px] font-medium flex-shrink-0 ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  )}
                </div>

                {expandedId === entry.id && (
                  <div className="px-4 pb-3 bg-zinc-900/60 space-y-2">
                    <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(entry.timestamp)}
                      </span>
                      {entry.duration !== undefined && (
                        <span>{entry.duration}ms</span>
                      )}
                      {entry.statusText && <span>{entry.statusText}</span>}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-400 bg-zinc-950 rounded px-2 py-1.5 break-all">
                      {entry.url}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white bg-transparent hover:bg-zinc-800"
                        onClick={() => handleReplay(entry)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open in Tab
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
