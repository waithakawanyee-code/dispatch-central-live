import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Vehicle {
  id: string;
  unit: string;
  vehicle_type?: string | null;
}

interface VehicleComboboxProps {
  vehicles: Vehicle[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeNone?: boolean;
}

// Quick key mappings: letter -> vehicle type keywords
const QUICK_KEY_MAP: Record<string, string[]> = {
  v: ["van"],
  c: ["car", "sedan", "volvo", "aviator"],
  s: ["suv"],
  b: ["bus", "shuttle", "28", "37", "39", "56"],
  l: ["limo", "stretch", "32_limo"],
  t: ["trolley"],
  m: ["sprinter"],
};

// Function to check if a vehicle matches the quick key search
function matchesQuickKeySearch(vehicle: Vehicle, search: string): boolean {
  const lowerSearch = search.toLowerCase().trim();
  if (!lowerSearch) return true;
  
  const lowerUnit = vehicle.unit.toLowerCase();
  const lowerType = (vehicle.vehicle_type || "").toLowerCase();
  
  // Direct match on unit
  if (lowerUnit.includes(lowerSearch)) {
    return true;
  }
  
  // Check for quick key pattern (e.g., "v49", "b37", "c23")
  const match = lowerSearch.match(/^([a-z])(\d+)$/);
  if (match) {
    const [, letter, number] = match;
    const keywords = QUICK_KEY_MAP[letter];
    if (keywords) {
      // Check if vehicle type matches any keyword and unit contains the number
      const typeMatches = keywords.some(keyword => lowerType.includes(keyword));
      const numberMatches = lowerUnit.includes(number);
      if (typeMatches && numberMatches) {
        return true;
      }
      // Also check unit for keywords (e.g., "Van-49" contains "van")
      const unitMatchesKeyword = keywords.some(keyword => lowerUnit.includes(keyword));
      if (unitMatchesKeyword && numberMatches) {
        return true;
      }
    }
  }
  
  // Check for just a letter prefix (e.g., "v" shows all vans)
  if (lowerSearch.length === 1 && QUICK_KEY_MAP[lowerSearch]) {
    const keywords = QUICK_KEY_MAP[lowerSearch];
    const typeMatches = keywords.some(keyword => lowerType.includes(keyword));
    const unitMatches = keywords.some(keyword => lowerUnit.includes(keyword));
    if (typeMatches || unitMatches) {
      return true;
    }
  }
  
  return false;
}

export function VehicleCombobox({
  vehicles,
  value,
  onValueChange,
  placeholder = "Select vehicle",
  includeNone = true,
}: VehicleComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  const selectedLabel = value === "__none__" 
    ? "No vehicle" 
    : value || placeholder;

  // Filter vehicles based on search with quick key support
  const filteredVehicles = React.useMemo(() => {
    if (!search) return vehicles;
    return vehicles.filter(v => matchesQuickKeySearch(v, search));
  }, [vehicles, search]);

  // Build items list for keyboard navigation
  const allItems = React.useMemo(() => {
    const items: { value: string; label: string }[] = [];
    // Only include "No vehicle" when there's no search query
    if (includeNone && !search) {
      items.push({ value: "__none__", label: "No vehicle" });
    }
    filteredVehicles.forEach(v => {
      items.push({ value: v.unit, label: v.unit });
    });
    return items;
  }, [includeNone, search, filteredVehicles]);

  // Reset highlight when search changes or dropdown opens
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [search, open]);

  // Reset search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const selectItem = (itemValue: string) => {
    onValueChange(itemValue);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (allItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < allItems.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case "Enter":
        e.preventDefault();
        if (allItems[highlightedIndex]) {
          selectItem(allItems[highlightedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        // Allow natural tab behavior - close dropdown and move focus
        setOpen(false);
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 z-50" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search... (v49, b37, c23)" 
            value={search}
            onValueChange={setSearch}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {allItems.length === 0 ? (
              <CommandEmpty>No vehicle found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {allItems.map((item, index) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => selectItem(item.value)}
                    className={cn(
                      index === highlightedIndex && "bg-accent text-accent-foreground"
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
