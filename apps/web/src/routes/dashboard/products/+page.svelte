<script lang="ts">
import { Package } from "@lucide/svelte";
import { createQuery } from "@tanstack/svelte-query";
import ProductForm from "$lib/components/product-form.svelte";
import { Badge } from "$lib/components/ui/badge";
import * as Card from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Skeleton } from "$lib/components/ui/skeleton";
import * as Table from "$lib/components/ui/table";
import { orpc } from "$lib/orpc";

let searchQuery = $state("");
let statusFilter = $state<string>("all");

function getQueryInput() {
	return statusFilter !== "all"
		? {
				status: statusFilter as "draft" | "active" | "archived",
				search: searchQuery || undefined,
			}
		: { search: searchQuery || undefined };
}

const productsQuery = createQuery(
	orpc.product.list.queryOptions(() => ({
		input: getQueryInput(),
	})),
);

const filteredProducts = $derived(
	$productsQuery.data?.products.filter((p) => {
		if (statusFilter !== "all" && p.status !== statusFilter) return false;
		if (
			searchQuery &&
			!p.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
			return false;
		return true;
	}) ?? [],
);
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-medium">Products</h2>
			<p class="text-sm text-muted-foreground">
				{$productsQuery.data?.total ?? 0} products total
			</p>
		</div>
		<ProductForm />
	</div>

	<div class="flex gap-4">
		<div class="flex-1">
			<Input
				placeholder="Search products..."
				bind:value={searchQuery}
			/>
		</div>
		<div class="w-40">
			<select
				bind:value={statusFilter}
				class="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
			>
				<option value="all">All Status</option>
				<option value="active">Active</option>
				<option value="draft">Draft</option>
				<option value="archived">Archived</option>
			</select>
		</div>
	</div>

	<Card.Root>
		<Card.Content class="p-0">
			{#if $productsQuery.isPending}
				<div class="p-6 space-y-4">
					{#each Array(5) as _}
						<div class="flex items-center gap-4">
							<Skeleton class="h-12 w-12 rounded" />
							<div class="space-y-2">
								<Skeleton class="h-4 w-48" />
								<Skeleton class="h-4 w-24" />
							</div>
						</div>
					{/each}
				</div>
			{:else if filteredProducts.length === 0}
				<div class="flex h-60 items-center justify-center text-muted-foreground">
					<div class="text-center">
						<Package class="mx-auto mb-2 size-8 text-muted-foreground/50" />
						<p>No products found</p>
					</div>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[300px]">Product</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Price</Table.Head>
							<Table.Head class="text-right">Stock</Table.Head>
							<Table.Head class="w-[100px]"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredProducts as product}
							<Table.Row>
								<Table.Cell>
									<a href="/dashboard/products/{product.id}" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
											{#if product.images && product.images.length > 0}
												<img
													src={product.images[0]}
													alt={product.name}
													class="size-8 rounded object-cover"
												/>
											{:else}
												<Package class="size-5 text-muted-foreground" />
											{/if}
										</div>
										<div>
											<p class="text-sm font-medium">{product.name}</p>
											<p class="text-xs text-muted-foreground">{product.sku ?? "No SKU"}</p>
										</div>
									</a>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant={product.status === "active"
											? "default"
											: product.status === "draft"
												? "secondary"
												: "outline"}
									>
										{product.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									${product.price.toFixed(2)}
								</Table.Cell>
								<Table.Cell class="text-right">
									{product.inventory?.quantity ?? 0}
								</Table.Cell>
								<Table.Cell>
									<ProductForm {product} />
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
