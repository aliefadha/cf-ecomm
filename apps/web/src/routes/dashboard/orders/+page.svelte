<script lang="ts">
import * as Card from "$lib/components/ui/card";
import { Badge } from "$lib/components/ui/badge";
import { ShoppingCart } from "@lucide/svelte";
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium">Orders</h2>
		<p class="text-sm text-muted-foreground">
			View and manage customer orders
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recent Orders</Card.Title>
			<Card.Description>Orders will appear here once customers start placing them.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex h-40 items-center justify-center text-muted-foreground">
				<div class="text-center">
					<ShoppingCart class="mx-auto mb-2 size-8 text-muted-foreground/50" />
					<p>No orders yet</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
