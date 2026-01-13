import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/ingestion", label: "Data Logs", icon: Database },
  ];

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">ReconBoard</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* User profile or other top-right items could go here */}
             <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">AD</span>
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
