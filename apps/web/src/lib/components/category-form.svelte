<script lang="ts">
import { Pencil, Plus, Trash } from "@lucide/svelte";
import {
	createMutation,
	createQuery,
	useQueryClient,
} from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { Textarea } from "$lib/components/ui/textarea";
import { orpc } from "$lib/orpc";

type Category = {
	id: string;
	name: string;
	description: string | null;
	slug: string;
	parentId: string | null;
	parent?: Category | null;
	children?: Category[];
	[k: string]: unknown;
};

interface Props {
	category?: Category;
	parentId?: string | null;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSuccess?: () => void;
}

let {
	category,
	parentId,
	open = $bindable(false),
	onOpenChange,
	onSuccess,
}: Props = $props();

let isEditing = $derived(!!category);
const qc = useQueryClient();

const createCategoryMutation = createMutation(
	orpc.category.create.mutationOptions({
		onSuccess: () => {
			toast.success("Category created");
			handleOpenChange(false);
			onSuccess?.();
			qc.invalidateQueries({ queryKey: orpc.category.list.queryKey({}) });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	}),
);

const updateCategoryMutation = createMutation(
	orpc.category.update.mutationOptions({
		onSuccess: () => {
			toast.success("Category updated");
			handleOpenChange(false);
			onSuccess?.();
			qc.invalidateQueries({ queryKey: orpc.category.list.queryKey({}) });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	}),
);

let formData = $state({
	name: "",
	description: "",
	parentId: "" as string,
});

const categoriesQuery = createQuery(orpc.category.list.queryOptions());

$effect(() => {
	if (open) {
		if (category) {
			formData = {
				name: category.name,
				description: category.description ?? "",
				parentId: category.parentId ?? "",
			};
		} else {
			formData = {
				name: "",
				description: "",
				parentId: parentId ?? "",
			};
		}
	}
});

function handleOpenChange(newOpen: boolean) {
	open = newOpen;
	onOpenChange?.(newOpen);
}

function handleSubmit(e: Event) {
	e.preventDefault();

	const parentIdValue = formData.parentId || undefined;

	if (isEditing && category) {
		const updatePayload = {
			id: category.id,
			name: formData.name,
			description: formData.description || undefined,
			parentId: parentIdValue,
		};
		$updateCategoryMutation.mutate(updatePayload);
	} else {
		const createPayload = {
			name: formData.name,
			description: formData.description || undefined,
			parentId: parentIdValue,
		};
		$createCategoryMutation.mutate(createPayload);
	}
}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title
				>{isEditing ? "Edit Category" : "Create Category"}</Dialog.Title
			>
			<Dialog.Description>
				{isEditing
					? "Update category details"
					: "Add a new category to organize your products"}
			</Dialog.Description>
		</Dialog.Header>

		<form id="category-form" class="space-y-4" onsubmit={handleSubmit}>
			<div class="space-y-2">
				<Label for="name">Name</Label>
				<Input
					id="name"
					bind:value={formData.name}
					placeholder="Category name"
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={formData.description}
					placeholder="Category description (optional)"
					rows={3}
				/>
			</div>

			<div class="space-y-2">
				<Label for="parent">Parent Category</Label>
				<select
					id="parent"
					bind:value={formData.parentId}
					class="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
				>
					<option value="">No parent</option>
					{#if $categoriesQuery.data}
						{#each $categoriesQuery.data as cat}
							{#if !isEditing || cat.id !== category?.id}
								<option value={cat.id}>{cat.name}</option>
							{/if}
						{/each}
					{/if}
				</select>
			</div>
		</form>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => handleOpenChange(false)}>
				Cancel
			</Button>
			<Button
				type="submit"
				form="category-form"
				disabled={$createCategoryMutation.isPending ||
					$updateCategoryMutation.isPending}
			>
				{$createCategoryMutation.isPending || $updateCategoryMutation.isPending
					? "Saving..."
					: isEditing
						? "Save Changes"
						: "Create Category"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

{#if isEditing && category}
	<Button variant="ghost" size="sm" onclick={() => handleOpenChange(true)}>
		<Pencil class="mr-2 size-4" />
		Edit
	</Button>
{:else}
	<Button onclick={() => handleOpenChange(true)}>
		<Plus class="mr-2 size-4" />
		Add Category
	</Button>
{/if}
