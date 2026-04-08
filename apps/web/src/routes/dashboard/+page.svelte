<script lang="ts">
import { createQuery } from "@tanstack/svelte-query";
import {
	Package,
	ShoppingCart,
	DollarSign,
	AlertTriangle,
} from "@lucide/svelte";
import { orpc } from "$lib/orpc";
import * as Card from "$lib/components/ui/card";
import { Skeleton } from "$lib/components/ui/skeleton";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";

const productsQuery = createQuery(
	orpc.product.list.queryOptions({ input: {} }),
);

const stats = $derived([
	{
		label: "Total Products",
		value: $productsQuery.data?.total ?? 0,
		icon: Package,
		href: "/dashboard/products",
	},
	{
		label: "Active Products",
		value:
			$productsQuery.data?.products.filter((p) => p.status === "active")
				.length ?? 0,
		icon: ShoppingCart,
		href: "/dashboard/products?status=active",
	},
	{
		label: "Draft Products",
		value:
			$productsQuery.data?.products.filter((p) => p.status === "draft")
				.length ?? 0,
		icon: DollarSign,
		href: "/dashboard/products?status=draft",
	},
	{
		label: "Low Stock",
		value:
			$productsQuery.data?.products.filter(
				(p) =>
					p.inventory &&
					p.inventory.quantity <= (p.inventory.lowStockThreshold ?? 10),
			).length ?? 0,
		icon: AlertTriangle,
		href: "/dashboard/inventory?lowStock=true",
	},
]);

const recentProducts = $derived(
	$productsQuery.data?.products.slice(0, 5) ?? [],
);
</script>

<div class="space-y-6">
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			<a href={stat.href}>
				<Card.Root class="hover:bg-muted/50 transition-colors">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">{stat.label}</Card.Title>
						<stat.icon class="size-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						{#if $productsQuery.isPending}
							<Skeleton class="h-8 w-20" />
						{:else}
							<div class="text-2xl font-bold">{stat.value}</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
		<Card.Root class="lg:col-span-4">
			<Card.Header>
				<Card.Title>Recent Products</Card.Title>
				<Card.Description>You have {$productsQuery.data?.total ?? 0} products in total.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if $productsQuery.isPending}
					<div class="space-y-2">
						{#each Array(5) as _}
							<div class="flex items-center gap-4">
								<Skeleton class="h-12 w-12 rounded" />
								<div class="space-y-2">
									<Skeleton class="h-4 w-32" />
									<Skeleton class="h-4 w-24" />
								</div>
							</div>
						{/each}
					</div>
				{:else if recentProducts.length === 0}
					<div class="flex h-40 items-center justify-center text-muted-foreground">
						No products yet
					</div>
				{:else}
					<div class="space-y-4">
						{#each recentProducts as product}
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-lg bg-muted"
								>
									{#if product.images && product.images.length > 0}
										<img
											src={product.images[0]}
											alt={product.name}
											class="size-10 rounded object-cover"
										/>
									{:else}
										<Package class="size-6 text-muted-foreground" />
									{/if}
								</div>
								<div class="flex-1 space-y-1">
									<p class="text-sm font-medium leading-none">{product.name}</p>
									<p class="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
								</div>
								<Badge
									variant={product.status === "active"
										? "default"
										: product.status === "draft"
											? "secondary"
											: "outline"}
								>
									{product.status}
								</Badge>
							</div>
						{/each}
					</div>
					<div class="mt-4">
						<Button variant="outline" href="/dashboard/products" class="w-full">
							View all products
						</Button>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="lg:col-span-3">
			<Card.Header>
				<Card.Title>Quick Actions</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button class="w-full justify-start" href="/dashboard/products?action=create">
					<Package class="mr-2 size-4" />
					Add New Product
				</Button>
				<Button class="w-full justify-start" variant="outline" href="/dashboard/orders">
					<ShoppingCart class="mr-2 size-4" />
					View Orders
				</Button>
				<Button class="w-full justify-start" variant="outline" href="/dashboard/inventory">
					<AlertTriangle class="mr-2 size-4" />
					Check Inventory
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
</div>
