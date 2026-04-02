import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Truck, History, ShieldAlert, UserCog, Calendar, Car, Settings, Wrench, Droplets, Plug, FileText, ChevronDown, CalendarOff } from "lucide-react";
import { DriverManagement } from "@/components/admin/DriverManagement";
import { VehicleManagement } from "@/components/admin/VehicleManagement";
import { VehicleAssignmentHistory } from "@/components/admin/VehicleAssignmentHistory";
import { HistoryLog } from "@/components/admin/HistoryLog";
import { UserManagement } from "@/components/admin/UserManagement";
import { ScheduleManagement } from "@/components/admin/ScheduleManagement";

import { TimeOffManagement } from "@/components/admin/TimeOffManagement";
import { SettingsManagement } from "@/components/admin/SettingsManagement";
import { IssueCatalogManagement } from "@/components/admin/IssueCatalogManagement";
import { VehicleStatusEventsLog } from "@/components/admin/VehicleStatusEventsLog";
import { IntegrationsManagement } from "@/components/admin/IntegrationsManagement";
import { ServiceTicketsManagement } from "@/components/admin/ServiceTicketsManagement";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AdminSection = 
  | "drivers" | "schedules" | "timeoff"
  | "vehicles" | "issues" | "tickets"
  | "cleanlog" | "assignments" | "history"
  | "settings" | "users" | "issue-catalog" | "integrations";

const NAVIGATION_GROUPS = [
  {
    id: "drivers",
    label: "Drivers",
    icon: Users,
    items: [
      { id: "drivers" as AdminSection, label: "Manage Drivers", icon: Users },
      { id: "schedules" as AdminSection, label: "Schedules", icon: Calendar },
      { id: "timeoff" as AdminSection, label: "Time Off", icon: CalendarOff },
    ],
  },
  {
    id: "vehicles",
    label: "Vehicles",
    icon: Truck,
    items: [
      { id: "vehicles" as AdminSection, label: "Manage Vehicles", icon: Truck },
      { id: "issues" as AdminSection, label: "Issues", icon: Wrench },
      { id: "tickets" as AdminSection, label: "Service Tickets", icon: FileText },
    ],
  },
  {
    id: "logs",
    label: "Logs",
    icon: History,
    items: [
      { id: "cleanlog" as AdminSection, label: "Clean Log", icon: Droplets },
      { id: "assignments" as AdminSection, label: "Assignments", icon: Car },
      { id: "history" as AdminSection, label: "History", icon: History },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { id: "settings" as AdminSection, label: "App Settings", icon: Settings },
      { id: "users" as AdminSection, label: "Users", icon: UserCog },
      { id: "issue-catalog" as AdminSection, label: "Issue Catalog", icon: Wrench },
      { id: "integrations" as AdminSection, label: "Integrations", icon: Plug },
    ],
  },
];

const Admin = () => {
  const { isAdmin, loading } = useUserRole();
  const [activeSection, setActiveSection] = useState<AdminSection>("drivers");

  // Find which group the active section belongs to
  const getActiveGroup = () => {
    for (const group of NAVIGATION_GROUPS) {
      if (group.items.some(item => item.id === activeSection)) {
        return group.id;
      }
    }
    return "drivers";
  };

  const activeGroup = getActiveGroup();

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

  const renderContent = () => {
    switch (activeSection) {
      case "drivers":
        return <DriverManagement />;
      case "schedules":
        return <ScheduleManagement />;
      case "timeclock":
        return <TimePunchReport />;
      case "timeoff":
        return <TimeOffManagement />;
      case "vehicles":
        return <VehicleManagement />;
      case "issues":
        return <IssueCatalogManagement />;
      case "tickets":
        return <ServiceTicketsManagement />;
      case "cleanlog":
        return <VehicleStatusEventsLog />;
      case "assignments":
        return <VehicleAssignmentHistory />;
      case "history":
        return <HistoryLog />;
      case "settings":
        return <SettingsManagement />;
      case "users":
        return <UserManagement />;
      case "issue-catalog":
        return <IssueCatalogManagement />;
      case "integrations":
        return <IntegrationsManagement />;
      default:
        return <DriverManagement />;
    }
  };

  // Get the current item label for the active section
  const getCurrentLabel = () => {
    for (const group of NAVIGATION_GROUPS) {
      const item = group.items.find(i => i.id === activeSection);
      if (item) return item.label;
    }
    return "Manage Drivers";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Dispatch</span>
          </Link>
          <div className="h-4 w-px bg-border/50" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Admin Panel</h1>
        </div>
        
        {/* Navigation Bar */}
        <div className="px-4 pb-2 flex items-center gap-1">
          {NAVIGATION_GROUPS.map((group) => {
            const isActiveGroup = activeGroup === group.id;
            const GroupIcon = group.icon;
            
            return (
              <DropdownMenu key={group.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-1.5 h-8 px-3 text-xs font-medium",
                      isActiveGroup 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <GroupIcon className="h-3.5 w-3.5" />
                    {group.label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = activeSection === item.id;
                    
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "gap-2 cursor-pointer",
                          isActive && "bg-accent"
                        )}
                      >
                        <ItemIcon className="h-3.5 w-3.5" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
          
          {/* Current section indicator */}
          <div className="ml-auto text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">
            {getCurrentLabel()}
          </div>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Admin;
