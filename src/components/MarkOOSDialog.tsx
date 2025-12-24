import { useState } from "react";
import { AlertTriangle, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMaintenanceEvents, useOpenMaintenanceEvent } from "@/hooks/useMaintenanceEvents";

interface MarkOOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleUnit: string;
  onOpenExistingTicket?: (eventId: string) => void;
}

export function MarkOOSDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicleUnit,
  onOpenExistingTicket,
}: MarkOOSDialogProps) {
  const { toast } = useToast();
  const { createEvent, isCreating } = useMaintenanceEvents(vehicleId);
  const { openEvent, hasOpenEvent, isLoading } = useOpenMaintenanceEvent(vehicleId);

  const [issueTitle, setIssueTitle] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [expectedBackDate, setExpectedBackDate] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setIssueTitle("");
    setIssueDetails("");
    setExpectedBackDate("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleViewExisting = () => {
    if (openEvent && onOpenExistingTicket) {
      onOpenExistingTicket(openEvent.id);
      handleClose();
    }
  };

  const handleSubmit = async () => {
    if (!issueTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter an issue title",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEvent({
        vehicleId,
        initialIssueTitle: issueTitle.trim(),
        initialIssueDetails: issueDetails.trim() || undefined,
        expectedBackInServiceAt: expectedBackDate || undefined,
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Vehicle marked Out of Service",
        description: `${vehicleUnit} has been taken out of service.`,
      });
      handleClose();
    } catch (error: any) {
      // Check for unique constraint violation
      if (error?.message?.includes("idx_vehicle_maintenance_events_one_open_per_vehicle")) {
        toast({
          title: "Already has open ticket",
          description: "This vehicle already has an open maintenance ticket.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create maintenance ticket",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return null;
  }

  // If there's already an open event, show a different dialog
  if (hasOpenEvent && openEvent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Open Ticket Exists
            </DialogTitle>
            <DialogDescription>
              {vehicleUnit} already has an open maintenance ticket. You cannot create another one until the existing ticket is closed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleViewExisting}>
              View Existing Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-status-out-of-service" />
            Mark {vehicleUnit} Out of Service
          </DialogTitle>
          <DialogDescription>
            Create a maintenance ticket and take this vehicle out of service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="issue-title">Issue Title *</Label>
            <Input
              id="issue-title"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-details">Issue Details</Label>
            <Textarea
              id="issue-details"
              value={issueDetails}
              onChange={(e) => setIssueDetails(e.target.value)}
              placeholder="Additional details about the issue (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-back">Expected Back in Service</Label>
            <Input
              id="expected-back"
              type="datetime-local"
              value={expectedBackDate}
              onChange={(e) => setExpectedBackDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this maintenance event"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isCreating}
            className="bg-status-out-of-service hover:bg-status-out-of-service/90"
          >
            {isCreating ? "Creating..." : "Mark Out of Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
