"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Server,
  Globe,
  Loader,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Copy,
  RotateCcw,
} from "lucide-react";
import {
  useCreateMockEndpoint,
  useCreateMockServer,
  useClearMockEndpointData,
  useDeleteMockEndpoint,
  useDeleteMockServer,
  useMockServers,
  useSeedWithAI,
} from "@/modules/mock/hooks";
import { REST_METHOD } from "@prisma/client";

const METHOD_COLORS: Record<REST_METHOD, string> = {
  GET: "text-green-400 bg-green-400/10 border-green-400/30",
  POST: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  PUT: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  PATCH: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  DELETE: "text-red-400 bg-red-400/10 border-red-400/30",
};

interface Props {
  workspaceId: string;
}

export default function MockServerPanel({ workspaceId }: Props) {
  const { data: servers, isLoading } = useMockServers(workspaceId);
  const { mutateAsync: createServer, isPending: creatingServer } = useCreateMockServer(workspaceId);
  const { mutateAsync: deleteServer } = useDeleteMockServer(workspaceId);
  const { mutateAsync: createEndpoint, isPending: creatingEndpoint } = useCreateMockEndpoint(workspaceId);
  const { mutateAsync: deleteEndpoint } = useDeleteMockEndpoint(workspaceId);
  const { mutateAsync: clearData } = useClearMockEndpointData(workspaceId);
  const { mutateAsync: seedWithAI, isPending: seeding } = useSeedWithAI(workspaceId);

  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverPrefix, setServerPrefix] = useState("");

  const [addingEndpointFor, setAddingEndpointFor] = useState<string | null>(null);
  const [epPath, setEpPath] = useState("/users");
  const [epMethod, setEpMethod] = useState<REST_METHOD>("GET");
  const [epDesc, setEpDesc] = useState("");

  const [seedingEndpointId, setSeedingEndpointId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  const BASE_URL =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const toggleServer = (id: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateServer = async () => {
    if (!serverName.trim() || !serverPrefix.trim()) {
      toast.error("Server name and prefix are required");
      return;
    }
    try {
      await createServer({ name: serverName, prefix: serverPrefix });
      toast.success(`Mock server '${serverPrefix}' created!`);
      setServerName("");
      setServerPrefix("");
      setShowCreateServer(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create server");
    }
  };

  const handleAddEndpoint = async (mockServerId: string) => {
    if (!epPath.trim()) {
      toast.error("Path is required");
      return;
    }
    try {
      await createEndpoint({ mockServerId, path: epPath, method: epMethod, description: epDesc });
      toast.success(`Endpoint ${epMethod} ${epPath} added!`);
      setAddingEndpointFor(null);
      setEpPath("/users");
      setEpMethod("GET");
      setEpDesc("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add endpoint");
    }
  };

  const handleSeedAI = async (endpointId: string) => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe what data to generate");
      return;
    }
    try {
      await seedWithAI({ endpointId, prompt: aiPrompt });
      toast.success("AI seeded data successfully!");
      setSeedingEndpointId(null);
      setAiPrompt("");
    } catch (e: any) {
      toast.error(e?.message ?? "AI seeding failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader className="animate-spin w-5 h-5 mr-2" />
        Loading mock servers...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-400">Mock Servers</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-indigo-400 hover:bg-indigo-400/10 h-7 px-2"
          onClick={() => setShowCreateServer((v) => !v)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Server
        </Button>
      </div>

      {/* Create Server Form */}
      {showCreateServer && (
        <div className="p-3 border-b border-zinc-800 bg-zinc-900 space-y-2">
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Server name (e.g. My CRM API)"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
          />
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="URL prefix (e.g. crm-api-v1)"
            value={serverPrefix}
            onChange={(e) => setServerPrefix(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          />
          {serverPrefix && (
            <p className="text-[10px] text-zinc-500">
              Base URL:{" "}
              <span className="text-indigo-400 font-mono">
                {BASE_URL}/api/mock/{serverPrefix}/...
              </span>
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white h-7 text-xs"
              onClick={handleCreateServer}
              disabled={creatingServer}
            >
              {creatingServer ? <Loader className="w-3 h-3 animate-spin" /> : "Create"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-zinc-700 text-zinc-400"
              onClick={() => setShowCreateServer(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Server List */}
      <div className="flex-1 overflow-y-auto">
        {!servers || servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600 p-6 text-center">
            <Server className="w-10 h-10" />
            <p className="text-sm font-medium text-zinc-400">No mock servers yet</p>
            <p className="text-xs">Create a server to simulate a live backend without writing any code.</p>
          </div>
        ) : (
          servers.map((server) => (
            <div key={server.id} className="border-b border-zinc-800">
              {/* Server Header */}
              <div
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-900 group"
                onClick={() => toggleServer(server.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {expandedServers.has(server.id) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  )}
                  <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{server.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">
                      /api/mock/{server.prefix}/...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(`${BASE_URL}/api/mock/${server.prefix}`);
                      toast.success("Base URL copied!");
                    }}
                    className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteServer(server.id);
                      toast.success("Server deleted");
                    }}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Endpoints */}
              {expandedServers.has(server.id) && (
                <div className="ml-4 border-l border-zinc-800 pl-3 py-1">
                  {server.endpoints.length === 0 && (
                    <p className="text-[10px] text-zinc-600 py-2 px-1">
                      No endpoints yet — add one below.
                    </p>
                  )}
                  {server.endpoints.map((ep) => (
                    <div key={ep.id} className="group mb-1">
                      <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-zinc-900">
                        <span
                          className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 ${METHOD_COLORS[ep.method]}`}
                        >
                          {ep.method}
                        </span>
                        <span className="text-xs font-mono text-zinc-300 truncate flex-1">
                          {ep.path}
                        </span>
                        <span className="text-[10px] text-zinc-600 shrink-0">
                          {Array.isArray(ep.dataStore) ? (ep.dataStore as unknown[]).length : 0} records
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                          <button
                            title="Seed with AI"
                            onClick={() => setSeedingEndpointId(ep.id)}
                            className="p-0.5 text-zinc-500 hover:text-yellow-400 rounded"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                          <button
                            title="Clear data"
                            onClick={async () => {
                              await clearData(ep.id);
                              toast.success("Data cleared");
                            }}
                            className="p-0.5 text-zinc-500 hover:text-blue-400 rounded"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            title="Delete endpoint"
                            onClick={async () => {
                              await deleteEndpoint(ep.id);
                              toast.success("Endpoint deleted");
                            }}
                            className="p-0.5 text-zinc-500 hover:text-red-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* AI Seed Panel */}
                      {seedingEndpointId === ep.id && (
                        <div className="mx-2 mb-2 p-2 bg-zinc-900 border border-orange-500/30 rounded space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-orange-400 font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Mistral + LangGraph Seeder
                            </p>
                            <span className="text-[9px] bg-orange-500/10 text-orange-300 border border-orange-500/20 px-1.5 py-0.5 rounded">
                              Mistral
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                            placeholder='e.g. "E-commerce products with name, price, stock, category"'
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium h-6 text-[10px]"
                              onClick={() => handleSeedAI(ep.id)}
                              disabled={seeding}
                            >
                              {seeding ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : (
                                "Generate & Seed"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] border-zinc-700 text-zinc-400"
                              onClick={() => setSeedingEndpointId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Endpoint Form */}
                  {addingEndpointFor === server.id ? (
                    <div className="p-2 mt-1 bg-zinc-900 border border-zinc-700 rounded space-y-2">
                      <div className="flex gap-2">
                        <select
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={epMethod}
                          onChange={(e) => setEpMethod(e.target.value as REST_METHOD)}
                        >
                          {(["GET", "POST", "PUT", "PATCH", "DELETE"] as REST_METHOD[]).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <input
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="/users or /users/:id"
                          value={epPath}
                          onChange={(e) => setEpPath(e.target.value)}
                        />
                      </div>
                      <input
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Description (optional)"
                        value={epDesc}
                        onChange={(e) => setEpDesc(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white h-6 text-[10px]"
                          onClick={() => handleAddEndpoint(server.id)}
                          disabled={creatingEndpoint}
                        >
                          {creatingEndpoint ? <Loader className="w-3 h-3 animate-spin" /> : "Add"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] border-zinc-700 text-zinc-400"
                          onClick={() => setAddingEndpointFor(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingEndpointFor(server.id)}
                      className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-indigo-400 px-2 py-1 mt-0.5 rounded hover:bg-zinc-900 w-full"
                    >
                      <Plus className="w-3 h-3" />
                      Add Endpoint
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
