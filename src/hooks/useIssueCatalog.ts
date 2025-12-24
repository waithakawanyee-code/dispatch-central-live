import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type IssueCategory = Database["public"]["Tables"]["maintenance_issue_categories"]["Row"];
export type IssueCategoryInsert = Database["public"]["Tables"]["maintenance_issue_categories"]["Insert"];
export type IssueCategoryUpdate = Database["public"]["Tables"]["maintenance_issue_categories"]["Update"];

export type IssueOption = Database["public"]["Tables"]["maintenance_issue_options"]["Row"];
export type IssueOptionInsert = Database["public"]["Tables"]["maintenance_issue_options"]["Insert"];
export type IssueOptionUpdate = Database["public"]["Tables"]["maintenance_issue_options"]["Update"];

export function useIssueCatalog() {
  const queryClient = useQueryClient();

  // Fetch all categories (including inactive for admin)
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["issue-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_issue_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as IssueCategory[];
    },
  });

  // Fetch all options (including inactive for admin)
  const { data: options = [], isLoading: optionsLoading } = useQuery({
    queryKey: ["issue-options-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_issue_options")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as IssueOption[];
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (category: IssueCategoryInsert) => {
      const { data, error } = await supabase
        .from("maintenance_issue_categories")
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-categories-admin"] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: IssueCategoryUpdate }) => {
      const { data, error } = await supabase
        .from("maintenance_issue_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-categories-admin"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_issue_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-categories-admin"] });
      queryClient.invalidateQueries({ queryKey: ["issue-options-admin"] });
    },
  });

  // Option mutations
  const createOptionMutation = useMutation({
    mutationFn: async (option: IssueOptionInsert) => {
      const { data, error } = await supabase
        .from("maintenance_issue_options")
        .insert(option)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-options-admin"] });
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: IssueOptionUpdate }) => {
      const { data, error } = await supabase
        .from("maintenance_issue_options")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-options-admin"] });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_issue_options")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-options-admin"] });
    },
  });

  return {
    categories,
    options,
    isLoading: categoriesLoading || optionsLoading,
    // Category operations
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    // Option operations
    createOption: createOptionMutation.mutateAsync,
    updateOption: updateOptionMutation.mutateAsync,
    deleteOption: deleteOptionMutation.mutateAsync,
    // Loading states
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isCreatingOption: createOptionMutation.isPending,
    isUpdatingOption: updateOptionMutation.isPending,
    isDeletingOption: deleteOptionMutation.isPending,
  };
}
