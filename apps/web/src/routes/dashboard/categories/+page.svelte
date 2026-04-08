<script lang="ts">
  import { FolderTree, Pencil, Trash2 } from "@lucide/svelte";
  import CategoryForm from "$lib/components/category-form.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Dialog from "$lib/components/ui/dialog";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";
  import { orpc } from "$lib/orpc";

  type CategoryNode = {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    parentId: string | null;
    parent?: CategoryNode | null;
    children?: CategoryNode[];
    [k: string]: unknown;
  };

  const categoriesQuery = createQuery(orpc.category.list.queryOptions());

  let searchQuery = $state("");
  let deleteDialogOpen = $state(false);
  let deleteCategoryId = $state<string | null>(null);
  let deleteCategoryName = $state<string>("");
  let isDeleting = $state(false);

  const deleteMutation = createMutation(
    orpc.category.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Category deleted");
        deleteDialogOpen = false;
        deleteCategoryId = null;
        deleteCategoryName = "";
      },
      onError: (error) => {
        toast.error(error.message);
        isDeleting = false;
      },
    }),
  );

  function flattenCategories(
    categories: CategoryNode[],
    depth = 0,
  ): Array<{ category: CategoryNode; depth: number }> {
    const result: Array<{ category: CategoryNode; depth: number }> = [];
    for (const cat of categories) {
      result.push({ category: cat, depth });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, depth + 1));
      }
    }
    return result;
  }

  const filteredFlatCategories = $derived(
    $categoriesQuery.data
      ? flattenCategories($categoriesQuery.data as CategoryNode[]).filter(
          ({ category }) =>
            category.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [],
  );

  function confirmDelete(category: CategoryNode) {
    deleteCategoryId = category.id;
    deleteCategoryName = category.name;
    deleteDialogOpen = true;
  }

  function handleDelete() {
    if (deleteCategoryId) {
      isDeleting = true;
      $deleteMutation.mutate({ id: deleteCategoryId });
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-medium">Categories</h2>
      <p class="text-sm text-muted-foreground">
        Organize your products with categories
      </p>
    </div>
    <CategoryForm />
  </div>

  <div class="flex gap-4">
    <div class="flex-1">
      <Input placeholder="Search categories..." bind:value={searchQuery} />
    </div>
  </div>

  <Card.Root>
    <Card.Content class="p-0">
      {#if $categoriesQuery.isPending}
        <div class="p-6 text-center text-muted-foreground">
          Loading categories...
        </div>
      {:else if filteredFlatCategories.length === 0}
        <div
          class="flex h-60 items-center justify-center text-muted-foreground"
        >
          <div class="text-center">
            <FolderTree class="mx-auto mb-2 size-8 text-muted-foreground/50" />
            <p>No categories found</p>
          </div>
        </div>
      {:else}
        <div class="divide-y">
          {#each filteredFlatCategories as { category, depth }}
            <div
              class="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              style="padding-left: {16 + depth * 24}px"
            >
              <FolderTree
                class="size-5 text-muted-foreground shrink-0"
                style="opacity: {1 - depth * 0.2}"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium">{category.name}</p>
                  {#if depth > 0}
                    <Badge variant="outline" class="text-xs">Subcategory</Badge>
                  {/if}
                </div>
                {#if category.description}
                  <p class="text-xs text-muted-foreground truncate">
                    {category.description}
                  </p>
                {/if}
              </div>
              <div class="flex items-center gap-1">
                <CategoryForm {category} />
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => confirmDelete(category)}
                >
                  <Trash2 class="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>

<Dialog.Root bind:open={deleteDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Delete Category</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete "{deleteCategoryName}"? This action
        cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (deleteDialogOpen = false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        disabled={isDeleting}
        onclick={handleDelete}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
