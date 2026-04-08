<script lang="ts">
import * as Card from "$lib/components/ui/card";
import { Boxes } from "@lucide/svelte";
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium">Inventory</h2>
		<p class="text-sm text-muted-foreground">
			Monitor and manage your stock levels
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Stock Levels</Card.Title>
			<Card.Description>Track product quantities and low stock alerts.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex h-40 items-center justify-center text-muted-foreground">
				<div class="text-center">
					<Boxes class="mx-auto mb-2 size-8 text-muted-foreground/50" />
					<p>No inventory data yet</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
