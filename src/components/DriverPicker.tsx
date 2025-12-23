import { useState, useEffect, useRef, useMemo } from "react";
import { Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

interface DriverPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: DriverRow[];
  onSelect: (driver: DriverRow) => void;
  title?: string;
}

export function DriverPicker({ open, onOpenChange, drivers, onSelect, title = "Select Driver" }: DriverPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter drivers by search term
  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers;
    const term = search.toLowerCase();
    return drivers.filter(driver => 
      driver.name.toLowerCase().includes(term) ||
      driver.code?.toLowerCase().includes(term)
    );
  }, [drivers, search]);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      // Focus input after a brief delay to ensure dialog is mounted
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredDrivers.length) {
      setSelectedIndex(Math.max(0, filteredDrivers.length - 1));
    }
  }, [filteredDrivers.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredDrivers.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, filteredDrivers.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredDrivers.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredDrivers.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredDrivers[selectedIndex]) {
          onSelect(filteredDrivers[selectedIndex]);
          onOpenChange(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };

  const handleDriverClick = (driver: DriverRow) => {
    onSelect(driver);
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    if (status === "assigned") return "bg-emerald-500";
    if (status === "unassigned" || status === "scheduled") return "bg-slate-500";
    if (["working", "on-route"].includes(status)) return "bg-status-available";
    return "bg-status-offline";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name..."
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </div>

        <div 
          ref={listRef}
          className="max-h-[300px] overflow-y-auto border-t border-border"
        >
          {filteredDrivers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No drivers found
            </div>
          ) : (
            filteredDrivers.map((driver, index) => (
              <div
                key={driver.id}
                data-index={index}
                onClick={() => handleDriverClick(driver)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                  "hover:bg-secondary/50",
                  index === selectedIndex && "bg-secondary"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor(driver.status))} />
                <span className="font-medium text-sm flex-1">{driver.name}</span>
                {driver.code && (
                  <span className="text-xs text-muted-foreground font-mono">{driver.code}</span>
                )}
                {driver.has_cdl && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground bg-secondary/30">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">Enter</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">Esc</kbd>
            cancel
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
