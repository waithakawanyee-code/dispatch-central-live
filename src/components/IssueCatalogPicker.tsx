import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveIssueCatalog, CategoryWithOptions } from "@/hooks/useActiveIssueCatalog";
import { cn } from "@/lib/utils";

interface IssueCatalogPickerProps {
  onSelect: (title: string, details?: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function IssueCatalogPicker({
  onSelect,
  onCancel,
  isSubmitting = false,
}: IssueCatalogPickerProps) {
  const { categories, isLoading } = useActiveIssueCatalog();
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithOptions | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customDetails, setCustomDetails] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleCategorySelect = (category: CategoryWithOptions) => {
    setSelectedCategory(category);
    setSelectedOption(null);
    setSearchQuery("");
  };

  const handleOptionSelect = (optionLabel: string) => {
    setSelectedOption(optionLabel);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setSelectedOption(null);
  };

  const handleConfirm = () => {
    if (selectedOption) {
      // Check if this is an "Other" type option that needs details
      const needsDetails = selectedOption.toLowerCase().includes("other") || 
                          selectedOption.toLowerCase().includes("describe");
      
      if (needsDetails && !customDetails.trim()) {
        return; // Don't allow submitting without details for "Other" options
      }
      
      onSelect(selectedOption, customDetails.trim() || undefined);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Check if selected option needs mandatory details
  const needsMandatoryDetails = selectedOption && 
    (selectedOption.toLowerCase().includes("other") || 
     selectedOption.toLowerCase().includes("describe"));

  return (
    <div className="space-y-3">
      {/* Search bar - only show when no category selected */}
      {!selectedCategory && (
        <div className="relative">
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
        <ScrollArea className="h-[280px]">
          <div className="space-y-1 pr-3">
            {filteredCategories.map((category) => {
              // If searching, show matching options under each category
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

                  {/* Show matching options when searching */}
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
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1 -ml-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Categories
          </Button>

          <div className="border-b pb-2 mb-2">
            <h4 className="font-medium text-sm">{selectedCategory.label}</h4>
          </div>

          <ScrollArea className="h-[200px]">
            <div className="space-y-1 pr-3">
              {selectedCategory.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionSelect(option.label)}
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

          {/* Details input - always show when option selected */}
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
        </>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={
            !selectedOption ||
            isSubmitting ||
            (needsMandatoryDetails && !customDetails.trim())
          }
        >
          {isSubmitting ? "Adding..." : "Add Issue"}
        </Button>
      </div>
    </div>
  );
}
