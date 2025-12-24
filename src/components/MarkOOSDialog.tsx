import { useState } from "react";
import { AlertTriangle, Wrench, ChevronLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

// Animation variants
const slideVariants = {
  enterFromRight: {
    x: "100%",
    opacity: 0,
  },
  enterFromLeft: {
    x: "-100%",
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exitToLeft: {
    x: "-100%",
    opacity: 0,
  },
  exitToRight: {
    x: "100%",
    opacity: 0,
  },
};

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

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithOptions | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const resetForm = () => {
    setStep(1);
    setSelectedCategory(null);
    setSelectedOption(null);
    setDescription("");
    setDirection("forward");
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
    setDescription("");
    setDirection("forward");
    setStep(2);
  };

  const handleBack = () => {
    setDirection("back");
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!selectedOption) {
      toast({
        title: "Error",
        description: "Please select an issue",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please provide a description",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEvent({
        vehicleId,
        initialIssueTitle: selectedOption,
        initialIssueDetails: description.trim(),
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-status-out-of-service" />
            Mark {vehicleUnit} Out of Service
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? "Select an issue category" : "Provide issue details"}
          </DialogDescription>
        </DialogHeader>

        {/* Content with animation */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="step1"
                initial={direction === "back" ? "enterFromLeft" : "center"}
                animate="center"
                exit="exitToLeft"
                variants={slideVariants}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 px-6 py-4 overflow-y-auto"
              >
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category)}
                      className={cn(
                        "relative group p-4 rounded-xl border-2 border-border bg-card text-left",
                        "transition-all duration-200 ease-out",
                        "hover:border-primary hover:bg-primary/5 hover:shadow-md",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        "active:scale-[0.98]"
                      )}
                    >
                      <span className="block font-medium text-sm text-foreground leading-tight">
                        {category.label}
                      </span>
                      <span className="block mt-1 text-xs text-muted-foreground">
                        {category.options.length} option{category.options.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && selectedCategory && (
              <motion.div
                key="step2"
                initial="enterFromRight"
                animate="center"
                exit="exitToRight"
                variants={slideVariants}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                {/* Category header with back button */}
                <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="gap-1 -ml-2 h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="h-4 w-px bg-border" />
                  <span className="font-medium text-sm">{selectedCategory.label}</span>
                </div>

                {/* Sub-issue selection */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Select Issue *</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategory.options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedOption(option.label)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                            "border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                            selectedOption === option.label
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          {option.label}
                          {selectedOption === option.label && (
                            <Check className="inline-block ml-1.5 h-3.5 w-3.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description - always required */}
                  <div className="space-y-2">
                    <Label htmlFor="issue-description" className="text-sm font-medium">
                      Description *
                    </Label>
                    <Textarea
                      id="issue-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the issue in detail..."
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide details to help the maintenance team understand the issue.
                    </p>
                  </div>
                </div>

                {/* Fixed footer with submit */}
                <div className="px-6 py-4 border-t bg-background">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isCreating || !selectedOption || !description.trim()}
                      className="flex-1 bg-status-out-of-service hover:bg-status-out-of-service/90"
                    >
                      {isCreating ? "Creating..." : "Mark Out of Service"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 1 footer */}
        {step === 1 && (
          <div className="px-6 py-4 border-t">
            <Button variant="outline" onClick={handleClose} className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
