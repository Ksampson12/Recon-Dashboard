import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type DashboardStats = z.infer<typeof api.dashboard.stats.responses[200]>;
type VehiclesListResponse = z.infer<typeof api.dashboard.list.responses[200]>;
type VehicleDetailResponse = z.infer<typeof api.dashboard.get.responses[200]>;

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.stats.path);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.dashboard.stats.responses[200].parse(await res.json());
    },
  });
}

export function useVehicles(filters?: {
  search?: string;
  status?: "NO_RECON_FOUND" | "IN_PROGRESS" | "COMPLETE";
  location?: string;
  sortBy?: "days_desc" | "days_asc" | "date_desc" | "date_asc";
}) {
  return useQuery<VehiclesListResponse>({
    queryKey: [api.dashboard.list.path, filters],
    queryFn: async () => {
      // Build query string manually or use URLSearchParams
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      
      // Filter for only IN_PROGRESS or NO_RECON_FOUND to show "only vehicles in recon"
      const statusFilter = filters?.status || "IN_PROGRESS";
      params.append("status", statusFilter);
      
      if (filters?.location && filters.location !== "ALL") params.append("location", filters.location);
      if (filters?.sortBy) params.append("sortBy", filters.sortBy);

      const url = `${api.dashboard.list.path}?${params.toString()}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return api.dashboard.list.responses[200].parse(await res.json());
    },
  });
}

export function useVehicleDetail(vin: string) {
  return useQuery<VehicleDetailResponse>({
    queryKey: [api.dashboard.get.path, vin],
    queryFn: async () => {
      const url = buildUrl(api.dashboard.get.path, { vin });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Vehicle not found");
      if (!res.ok) throw new Error("Failed to fetch vehicle details");
      return api.dashboard.get.responses[200].parse(await res.json());
    },
    enabled: !!vin,
  });
}
