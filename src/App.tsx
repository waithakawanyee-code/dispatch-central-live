import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Scheduler from "./pages/Scheduler";
import ShuttleSchedules from "./pages/ShuttleSchedules";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import ServiceTickets from "./pages/ServiceTickets";
import Display from "./pages/Display";
import CleaningQueues from "./pages/CleaningQueues";
import WasherDashboard from "./pages/WasherDashboard";
import NotFound from "./pages/NotFound";
import DriverProfile from "./pages/DriverProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            {/* Washer-only route */}
            <Route path="/washer" element={<ProtectedRoute allowedRoles={['WASHER', 'ADMIN']}><WasherDashboard /></ProtectedRoute>} />
            {/* Dispatcher/Admin routes */}
            <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'USER']}><Index /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'USER']}><Drivers /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'USER']}><Vehicles /></ProtectedRoute>} />
            <Route path="/service-tickets" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'USER']}><ServiceTickets /></ProtectedRoute>} />
            <Route path="/display" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'USER']}><Display /></ProtectedRoute>} />
            <Route path="/scheduler" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'USER']}><Scheduler /></ProtectedRoute>} />
            <Route path="/shuttle-schedules" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER', 'USER']}><ShuttleSchedules /></ProtectedRoute>} />
            <Route path="/cleaning-queues" element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}><CleaningQueues /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><Admin /></ProtectedRoute>} />
            <Route path="/admin/driver/:driverId" element={<ProtectedRoute allowedRoles={['ADMIN']}><DriverProfile /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
