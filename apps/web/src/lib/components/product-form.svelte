<script lang="ts">
import { Pencil, Plus } from "@lucide/svelte";
import {
	createMutation,
	createQuery,
	useQueryClient,
} from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { Textarea } from "$lib/components/ui/textarea";
import { orpc } from "$lib/orpc";
import ImageUploader from "./image-uploader.svelte";

type Product = {
	id: string;
	name: string;
	description: string | null;
	slug: string;
	price: number;
	compareAtPrice: number | null;
	costPrice: number | null;
	sku: string | null;
	barcode: string | null;
	images: string[] | null;
	weight: number | null;
	weightUnit: string | null;
	status: "draft" | "active" | "archived";
	categories: Array<{ category: { id: string; name: string } }>;
	inventory: {
		quantity: number | null;
		lowStockThreshold: number | null;
	} | null;
};

interface Props {
	product?: Product;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSuccess?: () => void;
}

let {
	product,
	open = $bindable(false),
	onOpenChange,
	onSuccess,
}: Props = $props();

let isEditing = $derived(!!product);
let uploadProductId = $state("");
const qc = useQueryClient();

const createProductMutation = createMutation(
	orpc.product.create.mutationOptions({
		onSuccess: () => {
			toast.success("Product created");
			handleOpenChange(false);
			onSuccess?.();
			qc.invalidateQueries({ queryKey: orpc.product.list.queryKey({}) });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	}),
);

const updateProductMutation = createMutation(
	orpc.product.update.mutationOptions({
		onSuccess: () => {
			toast.success("Product updated");
			handleOpenChange(false);
			onSuccess?.();
			qc.invalidateQueries({ queryKey: orpc.product.list.queryKey({}) });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	}),
);

const updateInventoryMutation = createMutation(
	orpc.product.updateInventory.mutationOptions({
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: orpc.product.list.queryKey({}) });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	}),
);

let formData = $state({
	name: "",
	description: "",
	price: 0,
	compareAtPrice: "",
	costPrice: "",
	sku: "",
	barcode: "",
	images: [] as string[],
	weight: "",
	weightUnit: "kg",
	status: "draft" as "draft" | "active" | "archived",
	categoryIds: [] as string[],
	trackInventory: true,
	quantity: 0,
	lowStockThreshold: 10,
});

const categoriesQuery = createQuery(orpc.category.list.queryOptions());

$effect(() => {
	if (open && product) {
		formData = {
			name: product.name,
			description: product.description ?? "",
			price: product.price,
			compareAtPrice: product.compareAtPrice?.toString() ?? "",
			costPrice: product.costPrice?.toString() ?? "",
			sku: product.sku ?? "",
			barcode: product.barcode ?? "",
			images: product.images ?? [],
			weight: product.weight?.toString() ?? "",
			weightUnit: product.weightUnit ?? "kg",
			status: product.status,
			categoryIds: product.categories?.map((c) => c.category.id) ?? [],
			trackInventory: !!product.inventory,
			quantity: product.inventory?.quantity ?? 0,
			lowStockThreshold: product.inventory?.lowStockThreshold ?? 10,
		};
		uploadProductId = product.id;
	} else if (open && !product) {
		formData = {
			name: "",
			description: "",
			price: 0,
			compareAtPrice: "",
			costPrice: "",
			sku: "",
			barcode: "",
			images: [],
			weight: "",
			weightUnit: "kg",
			status: "draft",
			categoryIds: [],
			trackInventory: true,
			quantity: 0,
			lowStockThreshold: 10,
		};
		uploadProductId = crypto.randomUUID();
	}
});

function handleOpenChange(newOpen: boolean) {
	open = newOpen;
	onOpenChange?.(newOpen);
}

function toggleCategory(categoryId: string) {
	if (formData.categoryIds.includes(categoryId)) {
		formData.categoryIds = formData.categoryIds.filter(
			(id) => id !== categoryId,
		);
	} else {
		formData.categoryIds = [...formData.categoryIds, categoryId];
	}
}

function handleSubmit(e: Event) {
	e.preventDefault();

	if (isEditing && product) {
		const updatePayload = {
			id: product.id,
			name: formData.name,
			description: formData.description || undefined,
			price: Number(formData.price),
			compareAtPrice: formData.compareAtPrice
				? Number(formData.compareAtPrice)
				: undefined,
			costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
			sku: formData.sku || undefined,
			barcode: formData.barcode || undefined,
			images: formData.images,
			weight: formData.weight ? Number(formData.weight) : undefined,
			weightUnit: formData.weightUnit,
			status: formData.status as "draft" | "active" | "archived",
			categoryIds: formData.categoryIds,
		};
		$updateProductMutation.mutate(updatePayload);

		if (formData.trackInventory) {
			$updateInventoryMutation.mutate({
				productId: product.id,
				quantity: Number(formData.quantity),
				lowStockThreshold: Number(formData.lowStockThreshold),
			});
		}
	} else {
		const createPayload = {
			name: formData.name,
			description: formData.description || undefined,
			price: Number(formData.price),
			compareAtPrice: formData.compareAtPrice
				? Number(formData.compareAtPrice)
				: undefined,
			costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
			sku: formData.sku || undefined,
			barcode: formData.barcode || undefined,
			images: formData.images,
			weight: formData.weight ? Number(formData.weight) : undefined,
			weightUnit: formData.weightUnit,
			status: formData.status as "draft" | "active" | "archived",
			categoryIds: formData.categoryIds,
			...(formData.trackInventory
				? {
						inventory: {
							quantity: Number(formData.quantity),
							lowStockThreshold: Number(formData.lowStockThreshold),
						},
					}
				: {}),
		};
		$createProductMutation.mutate(createPayload);
	}
}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{isEditing ? "Edit Product" : "Create Product"}</Dialog.Title>
			<Dialog.Description>
				{isEditing ? "Update product details" : "Add a new product to your inventory"}
			</Dialog.Description>
		</Dialog.Header>

		<form id="product-form" class="space-y-6" onsubmit={handleSubmit}>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2 sm:col-span-2">
					<Label for="name">Name</Label>
					<Input
						id="name"
						bind:value={formData.name}
						placeholder="Product name"
						required
					/>
				</div>

				<div class="space-y-2 sm:col-span-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						bind:value={formData.description}
						placeholder="Product description"
						rows={3}
					/>
				</div>

				<div class="space-y-2">
					<Label for="price">Price</Label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
						<Input
							id="price"
							type="number"
							step="0.01"
							min="0"
							class="pl-7"
							bind:value={formData.price}
							required
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="compareAtPrice">Compare at Price</Label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
						<Input
							id="compareAtPrice"
							type="number"
							step="0.01"
							min="0"
							class="pl-7"
							bind:value={formData.compareAtPrice}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="sku">SKU</Label>
					<Input id="sku" bind:value={formData.sku} placeholder="SKU" />
				</div>

				<div class="space-y-2">
					<Label for="barcode">Barcode</Label>
					<Input id="barcode" bind:value={formData.barcode} placeholder="Barcode" />
				</div>

				<div class="space-y-2">
					<Label for="status">Status</Label>
					<select
						id="status"
						bind:value={formData.status}
						class="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
					>
						<option value="draft">Draft</option>
						<option value="active">Active</option>
						<option value="archived">Archived</option>
					</select>
				</div>

				<div class="space-y-2">
					<Label for="weight">Weight</Label>
					<Input
						id="weight"
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.weight}
					/>
				</div>

				<div class="space-y-2">
					<Label for="weightUnit">Weight Unit</Label>
					<select
						id="weightUnit"
						bind:value={formData.weightUnit}
						class="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
					>
						<option value="kg">kg</option>
						<option value="lb">lb</option>
						<option value="oz">oz</option>
						<option value="g">g</option>
					</select>
				</div>
			</div>

			<div class="space-y-2">
				<Label>Categories</Label>
				{#if $categoriesQuery.isPending}
					<p class="text-sm text-muted-foreground">Loading categories...</p>
				{:else if $categoriesQuery.data}
					<div class="flex flex-wrap gap-2">
						{#each $categoriesQuery.data as category}
							<Badge
								variant={formData.categoryIds.includes(category.id) ? "default" : "outline"}
								class="cursor-pointer"
								onclick={() => toggleCategory(category.id)}
							>
								{category.name}
							</Badge>
						{/each}
					</div>
				{/if}
			</div>

			<div class="space-y-2">
				<Label>Images</Label>
				<ImageUploader
					productId={uploadProductId}
					images={formData.images}
					onImagesChange={(imgs) => (formData.images = imgs)}
				/>
			</div>

			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="trackInventory"
						bind:checked={formData.trackInventory}
						class="size-4 rounded border-input"
					/>
					<Label for="trackInventory">Track inventory for this product</Label>
				</div>
				{#if formData.trackInventory}
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="quantity">{isEditing ? "Stock Quantity" : "Initial Stock"}</Label>
							<Input
								id="quantity"
								type="number"
								min="0"
								bind:value={formData.quantity}
							/>
						</div>
						<div class="space-y-2">
							<Label for="lowStockThreshold">Low Stock Alert</Label>
							<Input
								id="lowStockThreshold"
								type="number"
								min="0"
								bind:value={formData.lowStockThreshold}
							/>
						</div>
					</div>
				{/if}
			</div>
		</form>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => handleOpenChange(false)}>Cancel</Button>
			<Button
				type="submit"
				form="product-form"
				disabled={$createProductMutation.isPending || $updateProductMutation.isPending}
			>
				{$createProductMutation.isPending || $updateProductMutation.isPending
					? "Saving..."
					: isEditing
						? "Save Changes"
						: "Create Product"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

{#if isEditing && product}
	<Button variant="ghost" size="sm" onclick={() => handleOpenChange(true)}>
		<Pencil class="mr-2 size-4" />
		Edit
	</Button>
{:else}
	<Button onclick={() => handleOpenChange(true)}>
		<Plus class="mr-2 size-4" />
		Add Product
	</Button>
{/if}
