import { useState, useEffect, useCallback } from "react";
import { format as dateFnsFormat } from "date-fns";

export type DateFormatOption = "MM/dd/yy" | "dd/MM/yy" | "yyyy-MM-dd" | "MMM d, yyyy";

export const DATE_FORMAT_OPTIONS: { value: DateFormatOption; label: string; example: string }[] = [
  { value: "MM/dd/yy", label: "MM/DD/YY", example: "12/23/25" },
  { value: "dd/MM/yy", label: "DD/MM/YY", example: "23/12/25" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD", example: "2025-12-23" },
  { value: "MMM d, yyyy", label: "Month D, YYYY", example: "Dec 23, 2025" },
];

const STORAGE_KEY = "dateFormatPreference";
const DEFAULT_FORMAT: DateFormatOption = "MM/dd/yy";

export function useDateFormat() {
  const [dateFormat, setDateFormatState] = useState<DateFormatOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && DATE_FORMAT_OPTIONS.some((opt) => opt.value === saved)) {
        return saved as DateFormatOption;
      }
    }
    return DEFAULT_FORMAT;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, dateFormat);
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent("dateFormatChanged", { detail: dateFormat }));
  }, [dateFormat]);

  // Listen for changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setDateFormatState(e.newValue as DateFormatOption);
      }
    };

    const handleFormatChange = (e: CustomEvent<DateFormatOption>) => {
      setDateFormatState(e.detail);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("dateFormatChanged", handleFormatChange as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("dateFormatChanged", handleFormatChange as EventListener);
    };
  }, []);

  const formatDate = useCallback(
    (date: Date | string | number, customFormat?: string): string => {
      try {
        const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
        return dateFnsFormat(dateObj, customFormat || dateFormat);
      } catch {
        return String(date);
      }
    },
    [dateFormat]
  );

  const setDateFormat = useCallback((format: DateFormatOption) => {
    setDateFormatState(format);
  }, []);

  return {
    dateFormat,
    setDateFormat,
    formatDate,
  };
}

// Standalone utility for components that just need formatting
export function getDateFormat(): DateFormatOption {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DATE_FORMAT_OPTIONS.some((opt) => opt.value === saved)) {
      return saved as DateFormatOption;
    }
  }
  return DEFAULT_FORMAT;
}

export function formatDateWithPreference(date: Date | string | number, customFormat?: string): string {
  try {
    const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    const format = customFormat || getDateFormat();
    return dateFnsFormat(dateObj, format);
  } catch {
    return String(date);
  }
}
