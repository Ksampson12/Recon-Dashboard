import { cn } from "@/lib/utils";
import { ReconStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: ReconStatus | string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status as ReconStatus;

  const variants: Record<string, string> = {
    COMPLETE: "bg-[hsl(var(--status-complete-bg))] text-[hsl(var(--status-complete))]",
    IN_PROGRESS: "bg-[hsl(var(--status-progress-bg))] text-[hsl(var(--status-progress))]",
    NO_RECON_FOUND: "bg-[hsl(var(--status-none-bg))] text-[hsl(var(--status-none))]",
  };

  const labels: Record<string, string> = {
    COMPLETE: "Complete",
    IN_PROGRESS: "In Progress",
    NO_RECON_FOUND: "No Recon",
  };

  const style = variants[normalizedStatus] || variants["NO_RECON_FOUND"];
  const label = labels[normalizedStatus] || "Unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
