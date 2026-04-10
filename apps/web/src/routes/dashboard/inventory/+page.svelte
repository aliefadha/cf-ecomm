<script lang="ts">
import { AlertTriangle, Boxes, Package } from "@lucide/svelte";
import {
	createMutation,
	createQuery,
	useQueryClient,
} from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";
import * as Dialog from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { Skeleton } from "$lib/components/ui/skeleton";
import * as Table from "$lib/components/ui/table";
import { orpc } from "$lib/orpc";

let searchQuery = $state("");
let updateDialogOpen = $state(false);
let updateProductId = $state<string | null>(null);
let updateProductName = $state<string>("");
let newQuantity = $state(0);

const qc = useQueryClient();

const inventoryQuery = createQuery(
	orpc.inventory.list.queryOptions({ input: {} }),
);

const filteredInventory = $derived(
	$inventoryQuery.data?.inventory.filter((inv) => {
		if (!searchQuery) return true;
		return inv.product?.name.toLowerCase().includes(searchQuery.toLowerCase());
	}) ?? [],
);

const updateMutation = createMutation(
	orpc.product.updateInventory.mutationOptions({
		onSuccess: () => {
			toast.success("Inventory updated");
			updateDialogOpen = false;
			updateProductId = null;
			qc.invalidateQueries({ queryKey: orpc.inventory.list.queryKey({}) });
		},
		onError: (error) => {
			toast.error(error.message);
		},
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
      <Card.Header
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <Card.Title class="text-sm font-medium">Total Products</Card.Title>
        <Boxes class="size-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{$inventoryQuery.data?.inventory.length ?? 0}</div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <Card.Title class="text-sm font-medium">Low Stock Items</Card.Title>
        <AlertTriangle class="size-4 text-destructive" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-destructive">
          {$inventoryQuery.data?.inventory.filter((inv) => inv.quantity <= (inv.lowStockThreshold ?? 10)).length ?? 0}
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <Card.Title class="text-sm font-medium">Total Stock Value</Card.Title>
        <Boxes class="size-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">
          ${$inventoryQuery.data?.inventory.reduce((sum, inv) => sum + inv.quantity * (inv.product?.price ?? 0), 0).toFixed(0) ?? 0}
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
      {#if $inventoryQuery.isPending}
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
      {:else if filteredInventory.length === 0}
        <div
          class="flex h-60 items-center justify-center text-muted-foreground"
        >
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
            {#each filteredInventory as inv}
              {@const isLowStock = inv.quantity <= (inv.lowStockThreshold ?? 10)}
              {@const available = inv.quantity - inv.reservedQuantity}
              <Table.Row class={isLowStock ? "bg-destructive/5" : ""}>
                <Table.Cell>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"
                    >
                      {#if inv.product?.images && inv.product.images.length > 0}
                        <img
                          src={inv.product.images[0]}
                          alt={inv.product.name}
                          class="size-8 rounded object-cover"
                        />
                      {:else}
                        <Package class="size-5 text-muted-foreground" />
                      {/if}
                    </div>
                    <div>
                      <p class="text-sm font-medium">{inv.product?.name ?? "Unknown"}</p>
                      <p class="text-xs text-muted-foreground">
                        ${inv.product?.price?.toFixed(2) ?? "0.00"}
                      </p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell class="text-right font-medium">
                  {inv.quantity}
                </Table.Cell>
                <Table.Cell class="text-right text-muted-foreground">
                  {inv.reservedQuantity}
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
                      {inv.lowStockThreshold ?? 10}
                    </Badge>
                  {/if}
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() =>
                      openUpdateDialog(
                        inv.productId,
                        inv.product?.name ?? "Unknown",
                        inv.quantity,
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
        <Input id="quantity" type="number" min="0" bind:value={newQuantity} />
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
