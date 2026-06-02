import { ReactNode } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PortalShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PortalShell({ title, subtitle, children }: PortalShellProps) {
  const navigate = useNavigate();
  const signOut = async () => {
    localStorage.removeItem("driver-portal-login-ts");
    await supabase.auth.signOut();
    navigate("/tablet", { replace: true });
  };
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/portal")}
            className="h-12 gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
          <div>
            <div className="text-2xl font-bold tracking-tight">{title}</div>
            {subtitle && (
              <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
            )}
          </div>
        </div>
        <Button variant="outline" size="lg" onClick={signOut} className="h-12 gap-2">
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
