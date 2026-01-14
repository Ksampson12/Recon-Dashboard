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
  status?: "IN_PROGRESS" | "COMPLETE";
  store?: "1" | "2" | "3"; // 1=ACF, 2=LCF, 3=CFMG
  location?: string;
  sortBy?: "days_desc" | "days_asc" | "date_desc" | "date_asc";
  page?: number;
  limit?: number;
}) {
  return useQuery<VehiclesListResponse>({
    queryKey: [api.dashboard.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      
      // Only add status filter if specified (otherwise show all)
      if (filters?.status) params.append("status", filters.status);
      
      // Store filter (1=ACF, 2=LCF, 3=CFMG)
      if (filters?.store) params.append("store", filters.store);
      
      if (filters?.location && filters.location !== "ALL") params.append("location", filters.location);
      if (filters?.sortBy) params.append("sortBy", filters.sortBy);
      if (filters?.page) params.append("page", String(filters.page));
      if (filters?.limit) params.append("limit", String(filters.limit));

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
