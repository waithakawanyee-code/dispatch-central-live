import { useState } from "react";
import { format } from "date-fns";
import { Wrench, Calendar, Clock, CheckCircle, X, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceIssuesPanel } from "./MaintenanceIssuesPanel";
import { useMaintenanceEvents, MaintenanceEvent } from "@/hooks/useMaintenanceEvents";

interface MaintenanceEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: MaintenanceEvent | null;
  vehicleUnit: string;
}

export function MaintenanceEventSheet({
  open,
  onOpenChange,
  event,
  vehicleUnit,
}: MaintenanceEventSheetProps) {
  const { toast } = useToast();
  const { updateEvent, closeEvent, isUpdating, isClosing } = useMaintenanceEvents(event?.vehicle_id);
  
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [expectedBackDate, setExpectedBackDate] = useState("");
  const [notes, setNotes] = useState("");

  const isClosed = !!event?.closed_at;

  const startEditHeader = () => {
    if (event) {
      setExpectedBackDate(event.expected_back_in_service_at?.slice(0, 16) || "");
      setNotes(event.notes || "");
      setIsEditingHeader(true);
    }
  };

  const cancelEditHeader = () => {
    setIsEditingHeader(false);
    setExpectedBackDate("");
    setNotes("");
  };

  const saveHeader = async () => {
    if (!event) return;

    try {
      await updateEvent({
        id: event.id,
        updates: {
          expected_back_in_service_at: expectedBackDate || null,
          notes: notes.trim() || null,
        },
      });
      toast({ title: "Success", description: "Ticket updated" });
      setIsEditingHeader(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      });
    }
  };

  const handleReturnToService = async () => {
    if (!event) return;

    try {
      await closeEvent(event.id);
      toast({
        title: "Vehicle Returned to Service",
        description: `${vehicleUnit} is now active.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive",
      });
    }
  };

  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-status-out-of-service" />
            Maintenance Ticket - {vehicleUnit}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {isClosed ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Closed
              </Badge>
            ) : (
              <Badge variant="destructive">Open</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Opened {format(new Date(event.opened_at), "MMM d, yyyy h:mm a")}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Ticket Details
              </h3>
              {!isClosed && !isEditingHeader && (
                <Button size="sm" variant="ghost" onClick={startEditHeader}>
                  Edit
                </Button>
              )}
            </div>

            {isEditingHeader ? (
              <div className="space-y-4 rounded-lg border border-border bg-card p-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-expected-back" className="text-xs">
                    Expected Back in Service
                  </Label>
                  <Input
                    id="edit-expected-back"
                    type="datetime-local"
                    value={expectedBackDate}
                    onChange={(e) => setExpectedBackDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes" className="text-xs">
                    Notes
                  </Label>
                  <Textarea
                    id="edit-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={cancelEditHeader} disabled={isUpdating}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveHeader} disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expected Back:</span>
                  <span>
                    {event.expected_back_in_service_at
                      ? format(new Date(event.expected_back_in_service_at), "MMM d, yyyy h:mm a")
                      : "Not set"}
                  </span>
                </div>
                {isClosed && event.actual_back_in_service_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Actual Back:</span>
                    <span>
                      {format(new Date(event.actual_back_in_service_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                )}
                {event.notes && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Issues Section */}
          <MaintenanceIssuesPanel
            maintenanceEventId={event.id}
            isTicketClosed={isClosed}
          />

          <Separator />

          {/* Return to Service Button */}
          {!isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full bg-status-active hover:bg-status-active/90">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Return to Service
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Return Vehicle to Service</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will close the maintenance ticket and mark {vehicleUnit} as active. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReturnToService}
                    disabled={isClosing}
                  >
                    {isClosing ? "Returning..." : "Return to Service"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isClosed && event.closed_at && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
              <p className="text-sm text-green-600">
                Ticket closed on {format(new Date(event.closed_at), "MMM d, yyyy h:mm a")}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
