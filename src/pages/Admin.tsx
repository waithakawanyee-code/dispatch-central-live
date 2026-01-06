import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Users, Truck, History, ShieldAlert, UserCog, Calendar, Clock, Car, Settings, Wrench, Droplets } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverManagement } from "@/components/admin/DriverManagement";
import { VehicleManagement } from "@/components/admin/VehicleManagement";
import { VehicleAssignmentHistory } from "@/components/admin/VehicleAssignmentHistory";
import { HistoryLog } from "@/components/admin/HistoryLog";
import { UserManagement } from "@/components/admin/UserManagement";
import { ScheduleManagement } from "@/components/admin/ScheduleManagement";
import { TimePunchReport } from "@/components/admin/TimePunchReport";
import { SettingsManagement } from "@/components/admin/SettingsManagement";
import { IssueCatalogManagement } from "@/components/admin/IssueCatalogManagement";
import { VehicleStatusEventsLog } from "@/components/admin/VehicleStatusEventsLog";

import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-destructive/20 mb-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the admin panel. Contact an administrator to request access.
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dispatch
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="timepunch" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Clock
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Issues
            </TabsTrigger>
            <TabsTrigger value="cleanlog" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Clean Log
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <DriverManagement />
          </TabsContent>

          <TabsContent value="vehicles">
            <VehicleManagement />
          </TabsContent>

          <TabsContent value="schedules">
            <ScheduleManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="timepunch">
            <TimePunchReport />
          </TabsContent>

          <TabsContent value="assignments">
            <VehicleAssignmentHistory />
          </TabsContent>

          <TabsContent value="history">
            <HistoryLog />
          </TabsContent>

          <TabsContent value="issues">
            <IssueCatalogManagement />
          </TabsContent>

          <TabsContent value="cleanlog">
            <VehicleStatusEventsLog />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
