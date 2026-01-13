import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import VehicleDetail from "@/pages/VehicleDetail";
import IngestionLogs from "@/pages/IngestionLogs";

function Router() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navigation />
      <main>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/vehicle/:vin" component={VehicleDetail} />
          <Route path="/ingestion" component={IngestionLogs} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
