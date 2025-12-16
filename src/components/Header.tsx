import { Clock, Settings, LogOut, Shield, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const {
    user,
    signOut
  } = useAuth();
  const {
    role,
    isAdmin
  } = useUserRole();
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 flex-col items-center justify-center rounded-lg bg-primary/20 px-4">
            <span className="font-bold text-primary text-3xl whitespace-nowrap">
              {currentTime.toLocaleDateString("en-US", {
              weekday: "long"
            })}
            </span>
            <span className="text-muted-foreground text-sm">
              {currentTime.toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit"
            })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/scheduler" className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Calendar className="h-4 w-4" />
            Schedule
          </Link>

          {isAdmin && <Link to="/admin" className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Settings className="h-4 w-4" />
              Admin
            </Link>}

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

          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="text-right">
              <span className="block text-xs text-muted-foreground truncate max-w-[150px]" title={user?.email || ""}>
                {user?.email}
              </span>
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] h-5">
                {isAdmin && <Shield className="h-3 w-3 mr-1" />}
                {role || "dispatcher"}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>;
}