<script lang="ts">
import { Users } from "@lucide/svelte";
import * as Card from "$lib/components/ui/card";
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium">Customers</h2>
		<p class="text-sm text-muted-foreground">
			View and manage your customers
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Customer List</Card.Title>
			<Card.Description>Customer accounts will appear here once they sign up.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex h-40 items-center justify-center text-muted-foreground">
				<div class="text-center">
					<Users class="mx-auto mb-2 size-8 text-muted-foreground/50" />
					<p>No customers yet</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
