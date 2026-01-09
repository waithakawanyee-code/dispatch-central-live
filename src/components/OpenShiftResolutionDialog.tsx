import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import type { Shift } from "@/hooks/useShifts";

interface OpenShiftResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousShift: Shift | null;
  driverName: string;
  onAutoClose: () => void;
  onCancel: () => void;
}

export function OpenShiftResolutionDialog({
  open,
  onOpenChange,
  previousShift,
  driverName,
  onAutoClose,
  onCancel,
}: OpenShiftResolutionDialogProps) {
  if (!previousShift) return null;

  const punchInTime = format(parseISO(previousShift.punch_in_at), "h:mm a");
  const workdayDate = format(parseISO(previousShift.workday_date), "EEEE, MMM d");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-amber-600">Open Shift Detected</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>{driverName}</strong> has an open shift from{" "}
              <strong>{workdayDate}</strong> (punched in at {punchInTime}).
            </p>
            <p className="text-sm text-muted-foreground">
              Choose how to resolve this before starting a new shift:
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancel}>
            Cancel (punch out first)
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onAutoClose}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Auto-close previous shift
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
