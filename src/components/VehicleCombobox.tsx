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

// Function to expand quick key searches
function expandQuickKeySearch(search: string): string {
  const lowerSearch = search.toLowerCase().trim();
  
  // Check if search starts with a quick key followed by numbers
  // e.g., "v49" -> search for "van" vehicles with "49"
  const match = lowerSearch.match(/^([a-z])(\d+)$/);
  if (match) {
    const [, letter, number] = match;
    const keywords = QUICK_KEY_MAP[letter];
    if (keywords) {
      // Return the number to filter by - we'll check vehicle type separately
      return number;
    }
  }
  
  return lowerSearch;
}

// Function to check if a vehicle matches the quick key search
function matchesQuickKeySearch(vehicle: Vehicle, search: string): boolean {
  const lowerSearch = search.toLowerCase().trim();
  const lowerUnit = vehicle.unit.toLowerCase();
  const lowerType = (vehicle.vehicle_type || "").toLowerCase();
  
  // Direct match on unit
  if (lowerUnit.includes(lowerSearch)) {
    return true;
  }
  
  // Check for quick key pattern (e.g., "v49", "b37")
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

  const selectedLabel = value === "__none__" 
    ? "No vehicle" 
    : value || placeholder;

  // Filter vehicles based on search with quick key support
  const filteredVehicles = React.useMemo(() => {
    if (!search) return vehicles;
    return vehicles.filter(v => matchesQuickKeySearch(v, search));
  }, [vehicles, search]);

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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search... (v49, b37, s12)" 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No vehicle found.</CommandEmpty>
            <CommandGroup>
              {includeNone && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onValueChange("__none__");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "__none__" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  No vehicle
                </CommandItem>
              )}
              {filteredVehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  value={vehicle.unit}
                  onSelect={() => {
                    onValueChange(vehicle.unit);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vehicle.unit ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {vehicle.unit}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
