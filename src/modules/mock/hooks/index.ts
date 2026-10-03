import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearMockEndpointData,
  createMockEndpoint,
  createMockServer,
  deleteMockEndpoint,
  deleteMockServer,
  getMockServers,
  seedMockEndpointWithAI,
} from "../actions";
import { REST_METHOD } from "@prisma/client";

export function useMockServers(workspaceId: string) {
  return useQuery({
    queryKey: ["mockServers", workspaceId],
    queryFn: () => getMockServers(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateMockServer(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, prefix }: { name: string; prefix: string }) =>
      createMockServer(workspaceId, name, prefix),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mockServers", workspaceId] }),
  });
}

export function useDeleteMockServer(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serverId: string) => deleteMockServer(serverId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mockServers", workspaceId] }),
  });
}

export function useCreateMockEndpoint(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mockServerId,
      path,
      method,
      description,
    }: {
      mockServerId: string;
      path: string;
      method: REST_METHOD;
      description?: string;
    }) => createMockEndpoint(mockServerId, path, method, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mockServers", workspaceId] }),
  });
}

export function useDeleteMockEndpoint(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => deleteMockEndpoint(endpointId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mockServers", workspaceId] }),
  });
}

export function useClearMockEndpointData(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => clearMockEndpointData(endpointId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mockServers", workspaceId] }),
  });
}

export function useSeedWithAI(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ endpointId, prompt }: { endpointId: string; prompt: string }) =>
      seedMockEndpointWithAI(endpointId, prompt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mockServers", workspaceId] }),
  });
}
