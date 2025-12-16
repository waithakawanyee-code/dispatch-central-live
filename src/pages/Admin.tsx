import { Link } from "react-router-dom";
import { ArrowLeft, Users, Truck, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverManagement } from "@/components/admin/DriverManagement";
import { VehicleManagement } from "@/components/admin/VehicleManagement";
import { HistoryLog } from "@/components/admin/HistoryLog";

const Admin = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Dispatch</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Drivers
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <DriverManagement />
          </TabsContent>

          <TabsContent value="vehicles">
            <VehicleManagement />
          </TabsContent>

          <TabsContent value="history">
            <HistoryLog />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
