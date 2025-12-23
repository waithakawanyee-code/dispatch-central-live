import { Clock, Settings, LogOut, Shield, Calendar, Users, Truck, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useDateFormat } from "@/hooks/useDateFormat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();
  const { formatDate } = useDateFormat();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = `${currentTime.toLocaleDateString("en-US", { weekday: "long" })}, ${formatDate(currentTime)}`;

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const navLinks = [
    { to: "/drivers", icon: Users, label: "Drivers" },
    { to: "/vehicles", icon: Truck, label: "Vehicles" },
    { to: "/display", icon: Monitor, label: "Display" },
    { to: "/scheduler", icon: Calendar, label: "Schedule" },
  ];

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 flex-col items-center justify-center rounded-lg bg-primary/20 px-4">
            <span className="font-bold text-primary text-3xl whitespace-nowrap">
              {currentTime.toLocaleDateString("en-US", { weekday: "long" })}
            </span>
            <span className="text-muted-foreground text-sm">
              {formatDate(currentTime)}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  location.pathname === to
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                location.pathname === "/admin"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          )}

          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-primary">LIVE</span>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-foreground">
              <Clock className="h-5 w-5 text-muted-foreground" />
              {formattedTime}
            </div>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>

          <div className="group relative flex items-center border-l border-border pl-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-right bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border whitespace-nowrap">
              <span className="block text-xs text-muted-foreground truncate max-w-[150px]" title={user?.email || ""}>
                {user?.email}
              </span>
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] h-5">
                {isAdmin && <Shield className="h-3 w-3 mr-1" />}
                {role || "dispatcher"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}