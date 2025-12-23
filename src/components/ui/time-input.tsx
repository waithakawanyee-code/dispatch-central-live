import * as React from "react";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * TimeInput component with HH:MM format
 * - User types hours only, Tab auto-fills :00 for minutes
 * - Tab exits the control entirely (no internal tab stops)
 * - Validates hours (0-23) and minutes (0-59)
 * - Single-digit hours padded to two digits (e.g., 7 → 07:00)
 */
export function TimeInput({
  value,
  onChange,
  id,
  className,
  placeholder = "HH:MM",
  disabled = false,
  onKeyDown,
}: TimeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState(value || "");

  // Sync external value changes
  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const normalizeTime = (val: string): string => {
    const trimmed = val.trim();
    
    if (!trimmed) return "";

    // If already in HH:MM format, validate and return
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(":").map(Number);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      }
      return "";
    }

    // If just digits (hours only), add :00
    if (/^\d{1,2}$/.test(trimmed)) {
      const h = parseInt(trimmed, 10);
      if (h >= 0 && h <= 23) {
        return `${h.toString().padStart(2, "0")}:00`;
      }
      return "";
    }

    // If partial format like "7:" or "07:"
    if (/^\d{1,2}:$/.test(trimmed)) {
      const h = parseInt(trimmed.slice(0, -1), 10);
      if (h >= 0 && h <= 23) {
        return `${h.toString().padStart(2, "0")}:00`;
      }
      return "";
    }

    // If partial format like "7:3" or "07:3"
    if (/^\d{1,2}:\d{1}$/.test(trimmed)) {
      const [hStr, mStr] = trimmed.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 5) {
        // Single digit minute means it's the tens place (e.g., 3 → 30)
        return `${h.toString().padStart(2, "0")}:${m}0`;
      }
      return "";
    }

    return "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Remove non-digit and non-colon characters
    val = val.replace(/[^\d:]/g, "");
    
    // Auto-insert colon after 2 digits if not present
    if (val.length === 2 && !val.includes(":") && inputValue.length < val.length) {
      val = val + ":";
    }
    
    // Limit to 5 characters (HH:MM)
    if (val.length > 5) {
      val = val.slice(0, 5);
    }

    setInputValue(val);
  };

  const handleBlur = () => {
    const normalized = normalizeTime(inputValue);
    setInputValue(normalized);
    onChange(normalized);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.key === "Enter") {
      // Normalize on Tab/Enter
      const normalized = normalizeTime(inputValue);
      setInputValue(normalized);
      onChange(normalized);
      
      // If Enter, prevent default and let parent handle it
      if (e.key === "Enter") {
        e.preventDefault();
        onKeyDown?.(e);
      }
    } else {
      onKeyDown?.(e);
    }
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono",
        className
      )}
      autoComplete="off"
    />
  );
}
