import * as React from "react";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onEnterSubmit?: () => void;
}

/**
 * TimeInput component with flexible 12/24 hour parsing
 * Supported formats:
 * - "930" → 09:30
 * - "9:30" → 09:30
 * - "930p" / "9:30pm" → 21:30
 * - "2130" / "21:30" → 21:30
 * - "12a" → 00:00
 * - "12p" → 12:00
 * - "7" → 07:00
 */
export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(({
  value,
  onChange,
  id,
  className,
  placeholder = "HH:MM",
  disabled = false,
  autoFocus = false,
  onKeyDown,
  onEnterSubmit,
}, ref) => {
  const [inputValue, setInputValue] = React.useState(value || "");

  // Sync external value changes
  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const parseFlexibleTime = (val: string): string => {
    const trimmed = val.trim().toLowerCase();
    
    if (!trimmed) return "";

    // Check for AM/PM suffix
    const hasAM = /a$|am$/.test(trimmed);
    const hasPM = /p$|pm$/.test(trimmed);
    const is12Hour = hasAM || hasPM;
    
    // Strip AM/PM suffix for parsing
    let numPart = trimmed.replace(/[ap]m?$/i, "").trim();
    
    let hours = 0;
    let minutes = 0;

    // Case: Already in HH:MM format (e.g., "9:30", "21:30", "12:00")
    if (/^\d{1,2}:\d{1,2}$/.test(numPart)) {
      const [h, m] = numPart.split(":").map(Number);
      hours = h;
      minutes = m;
    }
    // Case: 3-4 digits without colon (e.g., "930", "2130", "130")
    else if (/^\d{3,4}$/.test(numPart)) {
      if (numPart.length === 3) {
        // "930" → 9:30, "130" → 1:30
        hours = parseInt(numPart.slice(0, 1), 10);
        minutes = parseInt(numPart.slice(1), 10);
      } else {
        // "2130" → 21:30, "0930" → 09:30
        hours = parseInt(numPart.slice(0, 2), 10);
        minutes = parseInt(numPart.slice(2), 10);
      }
    }
    // Case: 1-2 digits only (e.g., "9", "21", "12")
    else if (/^\d{1,2}$/.test(numPart)) {
      hours = parseInt(numPart, 10);
      minutes = 0;
    }
    // Case: Partial with colon like "7:" or "21:"
    else if (/^\d{1,2}:$/.test(numPart)) {
      hours = parseInt(numPart.slice(0, -1), 10);
      minutes = 0;
    }
    // Case: Partial like "7:3" → 7:30
    else if (/^\d{1,2}:\d{1}$/.test(numPart)) {
      const [hStr, mStr] = numPart.split(":");
      hours = parseInt(hStr, 10);
      minutes = parseInt(mStr, 10) * 10; // Single digit minute is tens place
    }
    else {
      return ""; // Invalid format
    }

    // Handle 12-hour conversion
    if (is12Hour) {
      if (hours === 12) {
        // 12am = 00:00, 12pm = 12:00
        hours = hasAM ? 0 : 12;
      } else if (hasPM && hours < 12) {
        hours += 12;
      }
      // AM with hours < 12 stays as-is
    }

    // Validate ranges
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return "";
    }

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Allow digits, colon, and a/p/m characters for flexible input
    val = val.replace(/[^\d:apmAPM]/g, "");
    
    // Limit reasonable length
    if (val.length > 7) {
      val = val.slice(0, 7);
    }

    setInputValue(val);
  };

  const normalizeAndUpdate = () => {
    const normalized = parseFlexibleTime(inputValue);
    if (normalized) {
      setInputValue(normalized);
      onChange(normalized);
    } else if (inputValue.trim()) {
      // Invalid input - keep focus, don't update
      return false;
    }
    return true;
  };

  const handleBlur = () => {
    normalizeAndUpdate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      // Normalize on Tab
      normalizeAndUpdate();
      // Let tab continue naturally
    } else if (e.key === "Enter") {
      e.preventDefault();
      const valid = normalizeAndUpdate();
      if (valid && onEnterSubmit) {
        onEnterSubmit();
      }
    } else {
      onKeyDown?.(e);
    }
  };

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="text"
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono transition-all duration-150",
        className
      )}
      autoComplete="off"
    />
  );
});

TimeInput.displayName = "TimeInput";
