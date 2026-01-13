import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type IngestionLogsResponse = z.infer<typeof api.ingest.logs.responses[200]>;

export function useIngestionLogs() {
  return useQuery<IngestionLogsResponse>({
    queryKey: [api.ingest.logs.path],
    queryFn: async () => {
      const res = await fetch(api.ingest.logs.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.ingest.logs.responses[200].parse(await res.json());
    },
  });
}

export function useTriggerIngest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.ingest.trigger.path, {
        method: api.ingest.trigger.method,
      });
      if (!res.ok) throw new Error("Failed to trigger ingestion");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.ingest.logs.path] });
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.ingest.upload.path, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate logs so we see the new file
      queryClient.invalidateQueries({ queryKey: [api.ingest.logs.path] });
    },
  });
}
