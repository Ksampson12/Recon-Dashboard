import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  description?: string;
  className?: string;
}

export function KPICard({ title, value, icon: Icon, trend, description, className }: KPICardProps) {
  return (
    <div className={`bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {Icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold font-display text-foreground">{value}</span>
        {trend && (
          <span className="text-sm font-medium text-green-600">
            {trend}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
