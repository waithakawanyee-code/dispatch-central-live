import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useMaintenanceIssues, MaintenanceIssue } from "@/hooks/useMaintenanceIssues";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceIssuesPanelProps {
  maintenanceEventId: string;
  isTicketClosed: boolean;
}

export function MaintenanceIssuesPanel({
  maintenanceEventId,
  isTicketClosed,
}: MaintenanceIssuesPanelProps) {
  const { toast } = useToast();
  const {
    issues,
    isLoading,
    createIssue,
    updateIssue,
    deleteIssue,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMaintenanceIssues(maintenanceEventId);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");

  const resetAddForm = () => {
    setNewTitle("");
    setNewDetails("");
    setIsAdding(false);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      toast({
        title: "Error",
        description: "Issue title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await createIssue({
        maintenance_event_id: maintenanceEventId,
        title: newTitle.trim(),
        details: newDetails.trim() || null,
        created_by: user?.id || null,
      });

      toast({
        title: "Success",
        description: "Issue added successfully",
      });
      resetAddForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add issue",
        variant: "destructive",
      });
    }
  };

  const startEdit = (issue: MaintenanceIssue) => {
    setEditingId(issue.id);
    setEditTitle(issue.title);
    setEditDetails(issue.details || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDetails("");
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) {
      toast({
        title: "Error",
        description: "Issue title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateIssue({
        id,
        updates: {
          title: editTitle.trim(),
          details: editDetails.trim() || null,
        },
      });

      toast({
        title: "Success",
        description: "Issue updated successfully",
      });
      cancelEdit();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update issue",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIssue(id);
      toast({
        title: "Success",
        description: "Issue deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete issue",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertCircle className="h-4 w-4 text-primary" />
          Issues ({issues.length})
        </h3>
        {!isTicketClosed && !isAdding && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3" />
            Add Issue
          </Button>
        )}
      </div>

      {/* Add New Issue Form */}
      {isAdding && !isTicketClosed && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-issue-title" className="text-xs">
              Title *
            </Label>
            <Input
              id="new-issue-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Brief issue summary"
              className="h-8 text-sm"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-issue-details" className="text-xs">
              Details
            </Label>
            <Textarea
              id="new-issue-details"
              value={newDetails}
              onChange={(e) => setNewDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={resetAddForm}
              disabled={isCreating}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={isCreating}>
              <Check className="h-3 w-3 mr-1" />
              {isCreating ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-2">
        {issues.length === 0 && !isAdding && (
          <p className="text-xs text-muted-foreground italic py-2 text-center">
            No issues reported yet
          </p>
        )}

        {issues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-lg border border-border bg-card/50 p-3"
          >
            {editingId === issue.id ? (
              // Edit Mode
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`edit-title-${issue.id}`} className="text-xs">
                    Title *
                  </Label>
                  <Input
                    id={`edit-title-${issue.id}`}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-8 text-sm"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`edit-details-${issue.id}`} className="text-xs">
                    Details
                  </Label>
                  <Textarea
                    id={`edit-details-${issue.id}`}
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEdit}
                    disabled={isUpdating}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(issue.id)}
                    disabled={isUpdating}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {isUpdating ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {issue.title}
                    </p>
                    {issue.details && (
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        {issue.details}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Added {format(new Date(issue.created_at), "MMM d, yyyy h:mm a")}
                      {issue.updated_at !== issue.created_at && (
                        <span className="ml-2">
                          · Updated {format(new Date(issue.updated_at), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                    </p>
                  </div>
                  {!isTicketClosed && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(issue)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this issue? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(issue.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isTicketClosed && (
        <p className="text-xs text-muted-foreground italic text-center border-t border-border pt-3">
          This ticket is closed. Issues cannot be modified.
        </p>
      )}
    </div>
  );
}
