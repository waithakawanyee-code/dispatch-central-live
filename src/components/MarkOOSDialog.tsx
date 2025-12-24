import { useState } from "react";
import { AlertTriangle, Wrench, ChevronRight, ChevronLeft, Check, Search } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMaintenanceEvents, useOpenMaintenanceEvent } from "@/hooks/useMaintenanceEvents";
import { useActiveIssueCatalog, CategoryWithOptions } from "@/hooks/useActiveIssueCatalog";
import { cn } from "@/lib/utils";

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
  const { categories, isLoading: catalogLoading } = useActiveIssueCatalog();

  const [selectedCategory, setSelectedCategory] = useState<CategoryWithOptions | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customDetails, setCustomDetails] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expectedBackDate, setExpectedBackDate] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedOption(null);
    setCustomDetails("");
    setSearchQuery("");
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

  const handleCategorySelect = (category: CategoryWithOptions) => {
    setSelectedCategory(category);
    setSelectedOption(null);
    setSearchQuery("");
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setSelectedOption(null);
  };

  // Filter categories/options based on search
  const filteredCategories = searchQuery
    ? categories.filter(
        (cat) =>
          cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.options.some((opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : categories;

  // Check if selected option needs mandatory details
  const needsMandatoryDetails = selectedOption && 
    (selectedOption.toLowerCase().includes("other") || 
     selectedOption.toLowerCase().includes("describe"));

  const handleSubmit = async () => {
    if (!selectedOption) {
      toast({
        title: "Error",
        description: "Please select an issue",
        variant: "destructive",
      });
      return;
    }

    if (needsMandatoryDetails && !customDetails.trim()) {
      toast({
        title: "Error",
        description: "Please provide details for this issue",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEvent({
        vehicleId,
        initialIssueTitle: selectedOption,
        initialIssueDetails: customDetails.trim() || undefined,
        expectedBackInServiceAt: expectedBackDate || undefined,
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Vehicle marked Out of Service",
        description: `${vehicleUnit} has been taken out of service.`,
      });
      handleClose();
    } catch (error: any) {
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

  if (isLoading || catalogLoading) {
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-status-out-of-service" />
            Mark {vehicleUnit} Out of Service
          </DialogTitle>
          <DialogDescription>
            Select an issue to create a maintenance ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-2">
          {/* Search bar - only show when no category selected */}
          {!selectedCategory && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}

          {/* Category List */}
          {!selectedCategory && (
            <ScrollArea className="h-[250px]">
              <div className="space-y-1 pr-3">
                {filteredCategories.map((category) => {
                  const matchingOptions = searchQuery
                    ? category.options.filter((opt) =>
                        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : [];

                  const categoryMatches = category.label
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());

                  return (
                    <div key={category.id}>
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                          categoryMatches && searchQuery && "bg-accent/50"
                        )}
                      >
                        <span className="font-medium">{category.label}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs">{category.options.length}</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </button>

                      {searchQuery && matchingOptions.length > 0 && (
                        <div className="ml-4 border-l-2 border-muted pl-2 space-y-1 my-1">
                          {matchingOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(category);
                                setSelectedOption(opt.label);
                                setSearchQuery("");
                              }}
                              className="w-full text-left px-3 py-1.5 rounded text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No matching issues found
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Options List */}
          {selectedCategory && (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-1 -ml-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="border-b pb-2">
                <h4 className="font-medium text-sm">{selectedCategory.label}</h4>
              </div>

              <ScrollArea className="h-[160px]">
                <div className="space-y-1 pr-3">
                  {selectedCategory.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOption(option.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        selectedOption === option.label && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      <span>{option.label}</span>
                      {selectedOption === option.label && (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Details input */}
              {selectedOption && (
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="issue-details" className="text-xs">
                    Details {needsMandatoryDetails ? "*" : "(optional)"}
                  </Label>
                  <Textarea
                    id="issue-details"
                    value={customDetails}
                    onChange={(e) => setCustomDetails(e.target.value)}
                    placeholder={
                      needsMandatoryDetails
                        ? "Please describe the issue..."
                        : "Add any additional details..."
                    }
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Additional ticket fields */}
              {selectedOption && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="expected-back" className="text-xs">
                      Expected Back in Service
                    </Label>
                    <Input
                      id="expected-back"
                      type="datetime-local"
                      value={expectedBackDate}
                      onChange={(e) => setExpectedBackDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              isCreating || 
              !selectedOption ||
              (needsMandatoryDetails && !customDetails.trim())
            }
            className="bg-status-out-of-service hover:bg-status-out-of-service/90"
          >
            {isCreating ? "Creating..." : "Mark Out of Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
