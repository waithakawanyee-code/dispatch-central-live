import { useState } from "react";
import { useIssueCatalog, IssueCategory, IssueOption } from "@/hooks/useIssueCatalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  GripVertical,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function IssueCatalogManagement() {
  const {
    categories,
    options,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createOption,
    updateOption,
    deleteOption,
  } = useIssueCatalog();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingOptionTo, setAddingOptionTo] = useState<string | null>(null);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "option"; id: string; label: string } | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryLabel.trim()) return;
    try {
      const maxSort = Math.max(0, ...categories.map((c) => c.sort_order));
      await createCategory({ label: newCategoryLabel.trim(), sort_order: maxSort + 1 });
      setNewCategoryLabel("");
      setAddingCategory(false);
      toast.success("Category added");
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editLabel.trim()) return;
    try {
      await updateCategory({ id, updates: { label: editLabel.trim() } });
      setEditingCategory(null);
      toast.success("Category updated");
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleToggleCategoryActive = async (category: IssueCategory) => {
    try {
      await updateCategory({ id: category.id, updates: { is_active: !category.is_active } });
      toast.success(category.is_active ? "Category deactivated" : "Category activated");
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget || deleteTarget.type !== "category") return;
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const handleAddOption = async (categoryId: string) => {
    if (!newOptionLabel.trim()) return;
    try {
      const categoryOptions = options.filter((o) => o.category_id === categoryId);
      const maxSort = Math.max(0, ...categoryOptions.map((o) => o.sort_order));
      await createOption({
        category_id: categoryId,
        label: newOptionLabel.trim(),
        sort_order: maxSort + 1,
      });
      setNewOptionLabel("");
      setAddingOptionTo(null);
      toast.success("Option added");
    } catch (error) {
      toast.error("Failed to add option");
    }
  };

  const handleUpdateOption = async (id: string) => {
    if (!editLabel.trim()) return;
    try {
      await updateOption({ id, updates: { label: editLabel.trim() } });
      setEditingOption(null);
      toast.success("Option updated");
    } catch (error) {
      toast.error("Failed to update option");
    }
  };

  const handleToggleOptionActive = async (option: IssueOption) => {
    try {
      await updateOption({ id: option.id, updates: { is_active: !option.is_active } });
      toast.success(option.is_active ? "Option deactivated" : "Option activated");
    } catch (error) {
      toast.error("Failed to update option");
    }
  };

  const handleDeleteOption = async () => {
    if (!deleteTarget || deleteTarget.type !== "option") return;
    try {
      await deleteOption(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Option deleted");
    } catch (error) {
      toast.error("Failed to delete option");
    }
  };

  const startEditCategory = (category: IssueCategory) => {
    setEditingCategory(category.id);
    setEditLabel(category.label);
    setEditingOption(null);
  };

  const startEditOption = (option: IssueOption) => {
    setEditingOption(option.id);
    setEditLabel(option.label);
    setEditingCategory(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Issue Catalog</CardTitle>
        {!addingCategory && (
          <Button size="sm" onClick={() => setAddingCategory(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {addingCategory && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
            <Input
              placeholder="Category name..."
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              autoFocus
            />
            <Button size="sm" onClick={handleAddCategory}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingCategory(false); setNewCategoryLabel(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {categories.map((category) => {
          const categoryOptions = options.filter((o) => o.category_id === category.id);
          const isExpanded = expandedCategories.has(category.id);

          return (
            <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
              <div className={`border rounded-lg ${!category.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2 p-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  {editingCategory === category.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateCategory(category.id)}
                        autoFocus
                        className="h-8"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateCategory(category.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium flex-1">{category.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {categoryOptions.length} option{categoryOptions.length !== 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() => handleToggleCategoryActive(category)}
                        />
                        <Button size="sm" variant="ghost" onClick={() => startEditCategory(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ type: "category", id: category.id, label: category.label })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <CollapsibleContent>
                  <div className="border-t px-3 py-2 space-y-1 bg-muted/30">
                    {categoryOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center gap-2 p-2 rounded ${!option.is_active ? "opacity-60" : ""}`}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab ml-4" />

                        {editingOption === option.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleUpdateOption(option.id)}
                              autoFocus
                              className="h-7 text-sm"
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateOption(option.id)}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingOption(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm flex-1">{option.label}</span>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={option.is_active}
                                onCheckedChange={() => handleToggleOptionActive(option)}
                              />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditOption(option)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget({ type: "option", id: option.id, label: option.label })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {addingOptionTo === category.id ? (
                      <div className="flex items-center gap-2 p-2 ml-4">
                        <Input
                          placeholder="Option name..."
                          value={newOptionLabel}
                          onChange={(e) => setNewOptionLabel(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddOption(category.id)}
                          autoFocus
                          className="h-7 text-sm"
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleAddOption(category.id)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingOptionTo(null); setNewOptionLabel(""); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-4 text-xs"
                        onClick={() => setAddingOptionTo(category.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {categories.length === 0 && !addingCategory && (
          <div className="text-center py-8 text-muted-foreground">
            No categories yet. Click "Add Category" to create one.
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "category" ? "Category" : "Option"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.label}"?
              {deleteTarget?.type === "category" && " This will also delete all options in this category."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteTarget?.type === "category" ? handleDeleteCategory : handleDeleteOption}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
