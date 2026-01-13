import { useRoute, Link } from "wouter";
import { useVehicleDetail } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Loader2, ArrowLeft, Calendar, Gauge, MapPin, FileText, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

export default function VehicleDetail() {
  const [, params] = useRoute("/vehicle/:vin");
  const vin = params?.vin || "";
  
  const { data, isLoading, error } = useVehicleDetail(vin);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
  if (error || !data) return <div className="h-screen flex items-center justify-center text-red-500">Failed to load vehicle details</div>;

  const { vehicle, roHistory } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground hover:text-foreground pl-0">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </Link>

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Main Vehicle Info */}
        <div className="md:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold font-mono">
                  {vehicle.stockNo}
                </span>
                <span className="text-muted-foreground text-sm font-mono">{vin}</span>
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
            </div>
            <StatusBadge status={vehicle.reconStatus} className="text-sm px-4 py-1.5" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <Gauge className="w-3 h-3" /> Mileage
              </div>
              <p className="font-mono text-lg">{vehicle.mileage?.toLocaleString() ?? '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <Calendar className="w-3 h-3" /> Entry Date
              </div>
              <p className="font-mono text-lg">{vehicle.entryDate ? format(new Date(vehicle.entryDate), 'MM/dd/yy') : '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <MapPin className="w-3 h-3" /> Location
              </div>
              <p className="font-medium text-lg truncate">{vehicle.lotLocation || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <Clock className="w-3 h-3" /> Days in Recon
              </div>
              <p className={`font-mono text-lg font-bold ${
                (vehicle.reconDays || 0) > 10 ? "text-red-500" : "text-primary"
              }`}>
                {vehicle.reconDays ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Recon Status Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Current Status</span>
              <span className="font-medium">{vehicle.reconStatus}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Trigger RO</span>
              <span className="font-mono font-medium">{vehicle.lastReconRoNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Closed Date</span>
              <span className="font-medium">{vehicle.lastReconCloseDate ? format(new Date(vehicle.lastReconCloseDate), 'MMM d, yyyy') : 'N/A'}</span>
            </div>
          </div>
          {vehicle.reconStatus === "COMPLETE" && (
            <div className="mt-6 bg-white/50 p-3 rounded-lg text-xs text-muted-foreground">
              Vehicle completed recon process on {format(new Date(vehicle.lastReconCloseDate!), 'MM/dd/yyyy')}.
            </div>
          )}
        </div>
      </div>

      {/* RO History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Service History
        </h2>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {roHistory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No Repair Orders found for this vehicle.</div>
          ) : (
            <div className="divide-y divide-border">
              {roHistory.map((ro) => (
                <div key={ro.roNumber} className="group">
                  <div className="p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-background border border-border px-3 py-1 rounded text-sm font-mono font-semibold">
                        RO #{ro.roNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Opened: {ro.openDate ? format(new Date(ro.openDate), 'MM/dd/yyyy') : '-'}
                      </div>
                      {ro.closeDate && (
                        <div className="text-sm text-muted-foreground">
                          Closed: {format(new Date(ro.closeDate), 'MM/dd/yyyy')}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                      ro.status === 'C' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {ro.status === 'C' ? 'Closed' : 'Open'}
                    </div>
                  </div>
                  
                  {/* Lines */}
                  <div className="p-4 bg-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground uppercase tracking-wider text-left border-b border-border/50">
                          <th className="pb-2 w-32">Op Code</th>
                          <th className="pb-2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {ro.details.map((line, idx) => (
                          <tr key={idx} className={`${(line.opCode === '100' || line.opCode === 'UCI') ? 'bg-yellow-50/50' : ''}`}>
                            <td className="py-2 font-mono text-xs">{line.opCode}</td>
                            <td className="py-2 text-muted-foreground">
                              {line.description}
                              {(line.opCode === '100' || line.opCode === 'UCI') && <span className="ml-2 text-xs font-bold text-amber-600">(Recon Trigger)</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
