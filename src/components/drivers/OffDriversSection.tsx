import { useState, useMemo } from "react";
import { ChevronDown, PhoneOff, Search, UserPlus, X, Truck } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OffDriver {
  id: string;
  name: string;
  code?: string | null;
  has_cdl?: boolean;
}

interface OffDriversSectionProps {
  drivers: OffDriver[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  calledOutCount: number;
  markedOffCount: number;
  hasOffRecord: (id: string) => boolean;
  isActualCallOut: (id: string) => boolean;
  getCallOutNote: (id: string) => string | null;
  onAddToSchedule: (driverId: string, driverName: string) => void;
}

export function OffDriversSection({
  drivers,
  isOpen,
  onOpenChange,
  calledOutCount,
  markedOffCount,
  hasOffRecord,
  isActualCallOut,
  getCallOutNote,
  onAddToSchedule,
}: OffDriversSectionProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"regular" | "cdl">("regular");

  // Separate CDL and non-CDL drivers
  const { regularDrivers, cdlDrivers } = useMemo(() => {
    const regular = drivers.filter(d => !d.has_cdl);
    const cdl = drivers.filter(d => d.has_cdl);
    return { regularDrivers: regular, cdlDrivers: cdl };
  }, [drivers]);

  // Filter by search
  const filteredRegular = useMemo(() => {
    if (!search) return regularDrivers;
    const query = search.toLowerCase();
    return regularDrivers.filter(d => 
      d.name.toLowerCase().includes(query) || 
      d.code?.toLowerCase().includes(query)
    );
  }, [regularDrivers, search]);

  const filteredCdl = useMemo(() => {
    if (!search) return cdlDrivers;
    const query = search.toLowerCase();
    return cdlDrivers.filter(d => 
      d.name.toLowerCase().includes(query) || 
      d.code?.toLowerCase().includes(query)
    );
  }, [cdlDrivers, search]);

  const totalCount = drivers.length;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="mt-4">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-2.5 hover:bg-card/80 transition-colors cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")} />
          <PhoneOff className="h-4 w-4" />
          OFF / Not Scheduled
          {calledOutCount > 0 && (
            <span className="rounded-full bg-destructive/20 text-destructive px-2 py-0.5 font-mono text-xs">
              {calledOutCount} called out
            </span>
          )}
          {markedOffCount > 0 && (
            <span className="rounded-full bg-amber-500/20 text-amber-600 px-2 py-0.5 font-mono text-xs">
              {markedOffCount} marked off
            </span>
          )}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
          {totalCount}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {/* Search box */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search off drivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 pr-9 text-sm bg-background/50 rounded-lg"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tabbed content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "regular" | "cdl")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 mb-3">
            <TabsTrigger value="regular" className="text-xs h-7 gap-1.5">
              Regular
              <span className="bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono">
                {filteredRegular.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="cdl" className="text-xs h-7 gap-1.5">
              <Truck className="h-3 w-3" />
              CDL
              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-mono">
                {filteredCdl.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regular" className="mt-0">
            <OffDriverGrid
              drivers={filteredRegular}
              hasOffRecord={hasOffRecord}
              isActualCallOut={isActualCallOut}
              getCallOutNote={getCallOutNote}
              onAddToSchedule={onAddToSchedule}
              emptyMessage={search ? "No matching drivers" : "No OFF drivers"}
            />
          </TabsContent>

          <TabsContent value="cdl" className="mt-0">
            <OffDriverGrid
              drivers={filteredCdl}
              hasOffRecord={hasOffRecord}
              isActualCallOut={isActualCallOut}
              getCallOutNote={getCallOutNote}
              onAddToSchedule={onAddToSchedule}
              showCdlBadge
              emptyMessage={search ? "No matching CDL drivers" : "No OFF CDL drivers"}
            />
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Compact driver grid component
function OffDriverGrid({
  drivers,
  hasOffRecord,
  isActualCallOut,
  getCallOutNote,
  onAddToSchedule,
  showCdlBadge,
  emptyMessage,
}: {
  drivers: { id: string; name: string; code?: string | null; has_cdl?: boolean }[];
  hasOffRecord: (id: string) => boolean;
  isActualCallOut: (id: string) => boolean;
  getCallOutNote: (id: string) => string | null;
  onAddToSchedule: (driverId: string, driverName: string) => void;
  showCdlBadge?: boolean;
  emptyMessage: string;
}) {
  if (drivers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
      {drivers.map((driver) => {
        const markedOff = hasOffRecord(driver.id);
        const calledOut = isActualCallOut(driver.id);
        const note = getCallOutNote(driver.id);

        return (
          <div
            key={driver.id}
            className={cn(
              "group flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-all duration-150",
              calledOut
                ? "border-destructive/40 bg-destructive/10"
                : markedOff
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-border bg-card/60 hover:border-primary/40 hover:bg-card"
            )}
          >
            {/* Status dot */}
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                calledOut ? "bg-destructive" : markedOff ? "bg-amber-500" : "bg-muted-foreground/50"
              )}
            />

            {/* Driver name with code */}
            <span className="flex-1 truncate font-medium text-foreground" title={driver.name}>
              {driver.code ? (
                <>
                  <span className="text-muted-foreground">{driver.code}</span>
                  <span className="mx-1">·</span>
                  {driver.name.split(" ")[0]}
                </>
              ) : (
                driver.name
              )}
            </span>

            {/* Status icon */}
            {calledOut ? (
              <span title={note || "Called out"}>
                <PhoneOff className="h-3 w-3 text-destructive shrink-0" />
              </span>
            ) : markedOff ? (
              <span title="Marked off">
                <X className="h-3 w-3 text-amber-500 shrink-0" />
              </span>
            ) : null}

            {/* CDL badge */}
            {showCdlBadge && (
              <span className="text-[8px] font-bold text-primary bg-primary/15 px-1 py-0.5 rounded uppercase shrink-0">
                CDL
              </span>
            )}

            {/* Add button - appears on hover */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddToSchedule(driver.id, driver.name)}
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary shrink-0"
              title="Add to today's schedule"
            >
              <UserPlus className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
