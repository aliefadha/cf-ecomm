<script lang="ts">
import { page } from "$app/stores";
import { ArrowLeft, Package } from "@lucide/svelte";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";
import { Separator } from "$lib/components/ui/separator";
import { Skeleton } from "$lib/components/ui/skeleton";
import {
	createQuery,
	createMutation,
	useQueryClient,
} from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { orpc } from "$lib/orpc";

const qc = useQueryClient();

const orderQuery = createQuery(
	orpc.order.get.queryOptions({ input: { id: $page.params.id as string }, enabled: !!$page.params.id }),
);

const order = $derived($orderQuery.data);

const statusMutation = createMutation(
	orpc.order.updateStatus.mutationOptions({
		onSuccess: () => {
			toast.success("Order status updated");
			qc.invalidateQueries({
				queryKey: orpc.order.get.queryKey({ input: { id: $page.params.id as string } }),
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	}),
);

const statuses = [
	"pending",
	"confirmed",
	"processing",
	"shipped",
	"delivered",
	"cancelled",
	"refunded",
] as const;

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

function updateStatus(status: (typeof statuses)[number]) {
	if (order) {
		$statusMutation.mutate({ id: order.id, status });
	}
}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/dashboard/orders">
			<ArrowLeft class="size-4" />
		</Button>
		<div>
			<h2 class="text-lg font-medium">Order Details</h2>
			<p class="text-sm text-muted-foreground">
				View and manage order
			</p>
		</div>
	</div>

	{#if $orderQuery.isPending}
		<div class="grid gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Skeleton class="h-6 w-32" />
				</Card.Header>
				<Card.Content class="space-y-4">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-3/4" />
				</Card.Content>
			</Card.Root>
		</div>
	{:else if !order}
		<Card.Root>
			<Card.Content class="flex h-60 items-center justify-center">
				<div class="text-center">
					<Package class="mx-auto mb-2 size-8 text-muted-foreground/50" />
					<p class="text-muted-foreground">Order not found</p>
					<Button variant="link" href="/dashboard/orders" class="mt-2">
						Back to Orders
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title>Order #{order.id.slice(0, 8)}</Card.Title>
							<Badge variant={statusColors[order.status] ?? "outline"}>
								{order.status}
							</Badge>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">Date</span>
							<span class="text-sm">
								{new Date(order.createdAt).toLocaleDateString()} at{" "}
								{new Date(order.createdAt).toLocaleTimeString()}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">Items</span>
							<span class="text-sm">{order.itemsCount}</span>
						</div>
						<Separator />
						<div class="space-y-2">
							<p class="text-sm font-medium">Update Status</p>
							<div class="flex flex-wrap gap-2">
								{#each statuses as status}
									<Button
										variant={order.status === status ? "default" : "outline"}
										size="sm"
										disabled={order.status === status || $statusMutation.isPending}
										onclick={() => updateStatus(status)}
									>
										{status}
									</Button>
								{/each}
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				{#if order.notes}
					<Card.Root>
						<Card.Header>
							<Card.Title>Notes</Card.Title>
						</Card.Header>
						<Card.Content>
							<p class="text-sm">{order.notes}</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Order Items</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							{#each order.items as item}
								<div class="flex items-center gap-4">
									<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
										{#if item.product.images && item.product.images.length > 0}
											<img
												src={item.product.images[0]}
												alt={item.product.name}
												class="size-10 rounded object-cover"
											/>
										{:else}
											<Package class="size-5 text-muted-foreground" />
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium truncate">
											{item.product.name}
										</p>
										<p class="text-xs text-muted-foreground">
											{item.quantity} x ${item.priceAtPurchase.toFixed(2)}
										</p>
									</div>
									<div class="text-right">
										<p class="text-sm font-medium">
											${item.totalPrice.toFixed(2)}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Order Total</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Subtotal</span>
							<span>${order.subtotalAmount.toFixed(2)}</span>
						</div>
						{#if order.taxAmount}
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Tax</span>
								<span>${order.taxAmount.toFixed(2)}</span>
							</div>
						{/if}
						{#if order.shippingAmount}
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Shipping</span>
								<span>${order.shippingAmount.toFixed(2)}</span>
							</div>
						{/if}
						{#if order.discountAmount}
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">Discount</span>
								<span>-${order.discountAmount.toFixed(2)}</span>
							</div>
						{/if}
						<Separator />
						<div class="flex items-center justify-between">
							<span class="font-medium">Total</span>
							<span class="text-xl font-bold">
								${order.totalAmount.toFixed(2)} {order.currency}
							</span>
						</div>
					</Card.Content>
				</Card.Root>

				{#each order.addresses as address}
					<Card.Root>
						<Card.Header>
							<Card.Title class="capitalize">{address.type} Address</Card.Title>
						</Card.Header>
						<Card.Content>
							<p class="text-sm">
								{address.firstName} {address.lastName}
							</p>
							<p class="text-sm text-muted-foreground">
								{address.street}
								{#if address.street2}
									, {address.street2}
								{/if}
							</p>
							<p class="text-sm text-muted-foreground">
								{address.city}, {address.state} {address.postalCode}
							</p>
							<p class="text-sm text-muted-foreground">
								{address.country}
							</p>
							{#if address.phone}
								<p class="text-sm text-muted-foreground">
									{address.phone}
								</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</div>
