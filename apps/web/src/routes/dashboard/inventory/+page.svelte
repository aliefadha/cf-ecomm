<script lang="ts">
import { Boxes, AlertTriangle, Package } from "@lucide/svelte";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { Skeleton } from "$lib/components/ui/skeleton";
import * as Table from "$lib/components/ui/table";
import * as Dialog from "$lib/components/ui/dialog";
import {
	createQuery,
	createMutation,
	useQueryClient,
} from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { orpc } from "$lib/orpc";

let searchQuery = $state("");
let updateDialogOpen = $state(false);
let updateProductId = $state<string | null>(null);
let updateProductName = $state<string>("");
let newQuantity = $state(0);

const qc = useQueryClient();

const productsQuery = createQuery(
	orpc.product.list.queryOptions(() => ({ input: {} })),
);

const updateMutation = createMutation(
	orpc.product.updateInventory.mutationOptions({
		onSuccess: () => {
			toast.success("Inventory updated");
			updateDialogOpen = false;
			updateProductId = null;
			qc.invalidateQueries({ queryKey: orpc.product.list.queryKey({}) });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	}),
);

const inventoryProducts = $derived(
	$productsQuery.data?.products.filter((p) => p.inventory) ?? [],
);

const lowStockProducts = $derived(
	inventoryProducts.filter(
		(p) =>
			p.inventory &&
			p.inventory.quantity <= (p.inventory.lowStockThreshold ?? 10),
	),
);

const filteredProducts = $derived(
	inventoryProducts.filter((p) => {
		if (!searchQuery) return true;
		return p.name.toLowerCase().includes(searchQuery.toLowerCase());
	}),
);

function openUpdateDialog(
	productId: string,
	productName: string,
	currentQuantity: number,
) {
	updateProductId = productId;
	updateProductName = productName;
	newQuantity = currentQuantity;
	updateDialogOpen = true;
}

function handleUpdateStock() {
	if (updateProductId) {
		$updateMutation.mutate({
			productId: updateProductId,
			quantity: newQuantity,
		});
	}
}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-medium">Inventory</h2>
			<p class="text-sm text-muted-foreground">
				Monitor and manage your stock levels
			</p>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Products</Card.Title>
				<Boxes class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{inventoryProducts.length}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Low Stock Items</Card.Title>
				<AlertTriangle class="size-4 text-destructive" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-destructive">
					{lowStockProducts.length}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Stock Value</Card.Title>
				<Boxes class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					${inventoryProducts
						.reduce((sum, p) => sum + (p.inventory?.quantity ?? 0) * p.price, 0)
						.toFixed(0)}
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="flex gap-4">
		<div class="flex-1">
			<Input placeholder="Search products..." bind:value={searchQuery} />
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
						<Boxes class="mx-auto mb-2 size-8 text-muted-foreground/50" />
						<p>No inventory data found</p>
					</div>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[300px]">Product</Table.Head>
							<Table.Head class="text-right">Quantity</Table.Head>
							<Table.Head class="text-right">Reserved</Table.Head>
							<Table.Head class="text-right">Available</Table.Head>
							<Table.Head class="text-right">Low Stock Alert</Table.Head>
							<Table.Head class="w-[100px]"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredProducts as product}
							{@const inventory = product.inventory}
							{@const isLowStock = inventory && inventory.quantity <= (inventory.lowStockThreshold ?? 10)}
							{@const available = inventory ? inventory.quantity - inventory.reservedQuantity : 0}
							<Table.Row class={isLowStock ? "bg-destructive/5" : ""}>
								<Table.Cell>
									<div class="flex items-center gap-3">
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
											<p class="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right font-medium">
									{inventory?.quantity ?? 0}
								</Table.Cell>
								<Table.Cell class="text-right text-muted-foreground">
									{inventory?.reservedQuantity ?? 0}
								</Table.Cell>
								<Table.Cell class="text-right">
									{available}
								</Table.Cell>
								<Table.Cell class="text-right">
									{#if isLowStock}
										<Badge variant="destructive" class="gap-1">
											<AlertTriangle class="size-3" />
											Low Stock
										</Badge>
									{:else}
										<Badge variant="secondary">
											{inventory?.lowStockThreshold ?? 10}
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<Button
										variant="ghost"
										size="sm"
										onclick={() =>
											openUpdateDialog(
												product.id,
												product.name,
												inventory?.quantity ?? 0,
											)}
									>
										Update
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<Dialog.Root bind:open={updateDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Update Stock</Dialog.Title>
			<Dialog.Description>
				Updating inventory for <strong>{updateProductName}</strong>
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="quantity">New Quantity</Label>
				<Input
					id="quantity"
					type="number"
					min="0"
					bind:value={newQuantity}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (updateDialogOpen = false)}>
				Cancel
			</Button>
			<Button
				variant="default"
				disabled={$updateMutation.isPending}
				onclick={handleUpdateStock}
			>
				{$updateMutation.isPending ? "Updating..." : "Update Stock"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
