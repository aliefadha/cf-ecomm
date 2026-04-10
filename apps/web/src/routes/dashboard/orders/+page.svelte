<script lang="ts">
import { ShoppingCart } from "@lucide/svelte";
import { createQuery } from "@tanstack/svelte-query";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Skeleton } from "$lib/components/ui/skeleton";
import * as Table from "$lib/components/ui/table";
import { orpc } from "$lib/orpc";

let searchQuery = $state("");

const statusColors: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	pending: "secondary",
	confirmed: "default",
	processing: "default",
	shipped: "default",
	delivered: "default",
	cancelled: "destructive",
	refunded: "destructive",
};

const ordersQuery = createQuery(orpc.order.list.queryOptions(() => ({})));

const filteredOrders = $derived(
	$ordersQuery.data?.filter((order) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return order.id.toLowerCase().includes(query);
	}) ?? [],
);
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-medium">Orders</h2>
			<p class="text-sm text-muted-foreground">
				{$ordersQuery.data?.length ?? 0} orders total
			</p>
		</div>
	</div>

	<div class="flex gap-4">
		<div class="flex-1">
			<Input placeholder="Search by order ID..." bind:value={searchQuery} />
		</div>
	</div>

	<Card.Root>
		<Card.Content class="p-0">
			{#if $ordersQuery.isPending}
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
			{:else if filteredOrders.length === 0}
				<div class="flex h-60 items-center justify-center text-muted-foreground">
					<div class="text-center">
						<ShoppingCart class="mx-auto mb-2 size-8 text-muted-foreground/50" />
						<p>No orders found</p>
					</div>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[100px]">Order ID</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Total</Table.Head>
							<Table.Head class="text-right">Items</Table.Head>
							<Table.Head class="text-right">Date</Table.Head>
							<Table.Head class="w-[100px]"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredOrders as order}
							<Table.Row>
								<Table.Cell>
									<span class="font-mono text-xs">{order.id.slice(0, 8)}...</span>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={statusColors[order.status] ?? "outline"}>
										{order.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									${order.totalAmount.toFixed(2)}
								</Table.Cell>
								<Table.Cell class="text-right">
									{order.itemsCount}
								</Table.Cell>
								<Table.Cell class="text-right">
									{new Date(order.createdAt).toLocaleDateString()}
								</Table.Cell>
								<Table.Cell>
									<Button variant="ghost" size="sm" href="/dashboard/orders/{order.id}">
										View
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
