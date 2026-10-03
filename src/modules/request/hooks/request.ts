import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRequestToCollection,
  getAllRequestFromCollection,
  Request,
  run,
  executeTabRequest,
  saveRequest,
  deleteRequest,
} from "../actions";
import { useRequestPlaygroundStore } from "../store/useRequestStore";

function recordHistory(tab: any, data: any) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("postboy_request_history");
    const existing = raw ? JSON.parse(raw) : [];
    const newEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      method: tab?.method || "GET",
      url: tab?.url || "",
      status: data?.result?.status ?? data?.requestRun?.status,
      statusText: data?.result?.statusText ?? data?.requestRun?.statusText,
      duration: data?.result?.duration ?? data?.requestRun?.durationMs,
      timestamp: new Date().toISOString(),
      tabSnapshot: {
        headers: tab?.headers,
        parameters: tab?.parameters,
        body: tab?.body,
      },
    };
    const updated = [...existing, newEntry].slice(-100);
    localStorage.setItem("postboy_request_history", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("postboy:history_updated"));
  } catch (err) {
    console.error("Failed to save request history:", err);
  }
}

export function useAddRequestToCollection(collectionId: string) {
  const queryClient = useQueryClient();
  const { updateTabFromSavedRequest, activeTabId } = useRequestPlaygroundStore();
  return useMutation({
    mutationFn: async (value: Request) => addRequestToCollection(collectionId, value),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requests", collectionId] });
      // @ts-ignore
      updateTabFromSavedRequest(activeTabId!, data);
    },
  });
}

export function useGetAllRequestFromCollection(collectionId: string) {
  return useQuery({
    queryKey: ["requests", collectionId],
    queryFn: async () => getAllRequestFromCollection(collectionId),
  });
}

export function useSaveRequest(id: string) {
  const { updateTabFromSavedRequest, activeTabId } = useRequestPlaygroundStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: Request) => saveRequest(id, value),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });

      // @ts-ignore
      updateTabFromSavedRequest(activeTabId!, data);
    },
  });
}

export function useDeleteRequest() {
  const queryClient = useQueryClient();
  const { tabs, closeTab } = useRequestPlaygroundStore();
  return useMutation({
    mutationFn: async (id: string) => deleteRequest(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      const openTab = tabs.find((t) => t.requestId === id);
      if (openTab) {
        closeTab(openTab.id);
      }
    },
  });
}

export function useRunTabRequest() {
  const { setResponseViewerData } = useRequestPlaygroundStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tab: any) =>
      await executeTabRequest({
        requestId: tab?.requestId,
        method: tab?.method || "GET",
        url: tab?.url || "",
        headers: tab?.headers,
        parameters: tab?.parameters,
        body: tab?.body,
      }),
    onSuccess: (data: any, tab: any) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setResponseViewerData(data);
      recordHistory(tab, data);
    },
  });
}

export function useRunRequest(requestId: string) {
  const { setResponseViewerData } = useRequestPlaygroundStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => await run(requestId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      // @ts-ignore
      setResponseViewerData(data);
      recordHistory({ requestId }, data);
    },
  });
}