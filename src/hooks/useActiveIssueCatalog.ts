import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type IssueCategory = Database["public"]["Tables"]["maintenance_issue_categories"]["Row"];
export type IssueOption = Database["public"]["Tables"]["maintenance_issue_options"]["Row"];

export interface CategoryWithOptions extends IssueCategory {
  options: IssueOption[];
}

export function useActiveIssueCatalog() {
  // Fetch active categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["issue-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_issue_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as IssueCategory[];
    },
  });

  // Fetch active options
  const { data: options = [], isLoading: optionsLoading } = useQuery({
    queryKey: ["issue-options-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_issue_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as IssueOption[];
    },
  });

  // Combine categories with their options
  const categoriesWithOptions: CategoryWithOptions[] = categories.map((category) => ({
    ...category,
    options: options.filter((opt) => opt.category_id === category.id),
  }));

  return {
    categories: categoriesWithOptions,
    isLoading: categoriesLoading || optionsLoading,
  };
}
