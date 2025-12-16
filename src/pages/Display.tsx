import { Monitor } from "lucide-react";
import { Header } from "@/components/Header";

const Display = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Display
          </h1>
          <p className="text-sm text-muted-foreground">Command center display (to be configured)</p>
        </div>

        <section className="rounded-lg border border-border bg-card/50 p-8 text-center">
          <Monitor className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Display Configuration Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This page will be configured as a command center display showing real-time driver and vehicle status.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Display;