import { AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import type { Shift, Workday } from "@/hooks/useShifts";

interface WorkdayCloseoutBannerProps {
  workday: Workday | null;
  openShifts: Shift[];
  selectedDate: Date;
  onForceCloseShift: (shiftId: string) => void;
  onCloseOutWorkday: () => void;
  isAdmin: boolean;
}

export function WorkdayCloseoutBanner({
  workday,
  openShifts,
  selectedDate,
  onForceCloseShift,
  onCloseOutWorkday,
  isAdmin,
}: WorkdayCloseoutBannerProps) {
  const isToday = isSameDay(selectedDate, startOfDay(new Date()));
  const isPastDate = selectedDate < startOfDay(new Date()) && !isToday;
  
  // If workday is closed, show success banner
  if (workday?.status === "closed") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            Workday closed out on {format(parseISO(workday.closed_at!), "MMM d 'at' h:mm a")}
          </span>
        </div>
      </div>
    );
  }

  // Show warning if there are open shifts (especially for past dates)
  if (openShifts.length > 0) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {isPastDate ? (
                <>
                  {openShifts.length} shift{openShifts.length > 1 ? "s" : ""} from this date {openShifts.length > 1 ? "were" : "was"} not closed out
                </>
              ) : (
                <>
                  {openShifts.length} open shift{openShifts.length > 1 ? "s" : ""} for this workday
                </>
              )}
            </span>
          </div>
          {isAdmin && openShifts.length === 0 && (
            <Button size="sm" variant="outline" onClick={onCloseOutWorkday}>
              Mark Day Closed
            </Button>
          )}
        </div>
        
        {/* List open shifts with force-close action */}
        <div className="flex flex-wrap gap-2">
          {openShifts.map(shift => (
            <div 
              key={shift.id} 
              className="flex items-center gap-2 rounded bg-amber-100 dark:bg-amber-900/30 px-2 py-1 text-xs"
            >
              <Clock className="h-3 w-3" />
              <span className="font-medium">{shift.driver_name}</span>
              <span className="text-muted-foreground">
                since {format(parseISO(shift.punch_in_at), "h:mm a")}
              </span>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 ml-1 hover:bg-amber-200 dark:hover:bg-amber-800"
                  onClick={() => onForceCloseShift(shift.id)}
                  title="Force close shift"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No open shifts, offer to close out the workday
  if (isPastDate && isAdmin) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            All shifts closed for this workday
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onCloseOutWorkday}>
          Mark Day Closed
        </Button>
      </div>
    );
  }

  return null;
}
