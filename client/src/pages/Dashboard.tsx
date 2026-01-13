import { useState } from "react";
import { Link } from "wouter";
import { useDashboardStats, useVehicles } from "@/hooks/use-dashboard";
import { useTriggerIngest } from "@/hooks/use-ingest";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadDialog } from "@/components/UploadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  RefreshCw, 
  Search, 
  Car, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { mutate: triggerIngest, isPending: ingestPending } = useTriggerIngest();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<string>("days_desc");

  // Debounced search could be added here, for now passing direct
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles({
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter as any,
    sortBy: sort as any,
  });

  const handleRefresh = () => {
    triggerIngest(undefined, {
      onSuccess: () => {
        toast({ title: "Data Refresh Triggered", description: "Processing latest data..." });
      }
    });
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time recon performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={ingestPending}
            className="gap-2"
          >
            {ingestPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh Data
          </Button>
          <UploadDialog />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Avg Recon Days" 
          value={stats?.avgReconDays.toFixed(1) || "0.0"} 
          icon={Clock}
          description="Average time to complete"
          className="border-l-4 border-l-primary"
        />
        <KPICard 
          title="In Progress" 
          value={stats?.countInProgress || 0} 
          icon={TrendingUp}
          description="Vehicles currently in recon"
          className="border-l-4 border-l-amber-500"
        />
        <KPICard 
          title="Completed" 
          value={stats?.countCompleted || 0} 
          icon={CheckCircle2}
          description="Total completed vehicles"
          className="border-l-4 border-l-emerald-500"
        />
        <KPICard 
          title="Over Threshold" 
          value={stats?.countOverThreshold || 0} 
          icon={AlertCircle}
          description="> 10 days in recon"
          className="border-l-4 border-l-red-500"
        />
      </div>

      {/* Filters & Controls */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search VIN or Stock #..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="NO_RECON_FOUND">No Recon</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="days_desc">Recon Days (High-Low)</SelectItem>
            <SelectItem value="days_asc">Recon Days (Low-High)</SelectItem>
            <SelectItem value="date_desc">Newest Entry</SelectItem>
            <SelectItem value="date_asc">Oldest Entry</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Stock #</th>
                <th className="px-6 py-4">VIN</th>
                <th className="px-6 py-4">Year/Make/Model</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Recon Days</th>
                <th className="px-6 py-4 text-right">Entry Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehiclesLoading ? (
                 <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                     <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                     Loading vehicles...
                   </td>
                 </tr>
              ) : vehiclesData?.items.length === 0 ? (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                     No vehicles found matching your criteria.
                   </td>
                 </tr>
              ) : (
                vehiclesData?.items.map((vehicle) => (
                  <tr key={vehicle.vin} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{vehicle.stockNo}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{vehicle.vin.slice(-8)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {vehicle.year} <span className="font-semibold">{vehicle.make}</span> {vehicle.model}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={vehicle.reconStatus} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-bold ${
                        (vehicle.reconDays || 0) > 10 ? 'text-red-600' : 'text-foreground'
                      }`}>
                        {vehicle.reconDays ?? '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {vehicle.entryDate ? format(new Date(vehicle.entryDate), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/vehicle/${vehicle.vin}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination could go here */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span>Showing {vehiclesData?.items.length || 0} of {vehiclesData?.total || 0} vehicles</span>
        </div>
      </div>
    </div>
  );
}
