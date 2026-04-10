<script lang="ts">
import { page } from "$app/stores";

const { children } = $props();

import {
	Boxes,
	ChevronLeft,
	FolderTree,
	LayoutDashboard,
	LogOut,
	Package,
	ShoppingCart,
	Users,
} from "@lucide/svelte";
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth-client";
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";

const sessionQuery = authClient.useSession();

$effect(() => {
	if (!$sessionQuery.isPending && !$sessionQuery.data) {
		goto("/login");
	}
});

const navItems = [
	{ href: "/dashboard", label: "Overview", icon: LayoutDashboard },
	{ href: "/dashboard/products", label: "Products", icon: Package },
	{ href: "/dashboard/categories", label: "Categories", icon: FolderTree },
	{ href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
	{ href: "/dashboard/customers", label: "Customers", icon: Users },
	{ href: "/dashboard/inventory", label: "Inventory", icon: Boxes },
];

let collapsed = $state(false);

function isActive(href: string) {
	if (href === "/dashboard") {
		return $page.url.pathname === "/dashboard";
	}
	return $page.url.pathname.startsWith(href);
}
</script>

{#if $sessionQuery.isPending}
	<div class="flex h-svh items-center justify-center">
		<div class="text-muted-foreground">Loading...</div>
	</div>
{:else if $sessionQuery.data}
	<div class="flex h-svh overflow-hidden">
		<aside
			class="flex flex-col border-r bg-card transition-all duration-300"
			class:w-64={!collapsed}
			class:w-16={collapsed}
		>
			<div class="flex h-14 items-center border-b px-4">
				{#if !collapsed}
					<span class="font-semibold">Admin</span>
				{:else}
					<span class="font-semibold">A</span>
				{/if}
			</div>

			<nav class="flex-1 space-y-1 p-2">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
						class:bg-muted={isActive(item.href)}
						class:text-foreground={isActive(item.href)}
						class:text-muted-foreground={!isActive(item.href)}
						class:hover:bg-muted={!isActive(item.href)}
						class:hover:text-foreground={!isActive(item.href)}
					>
						<item.icon class="size-5 shrink-0" />
						{#if !collapsed}
							<span>{item.label}</span>
						{/if}
					</a>
				{/each}
			</nav>

			<div class="border-t p-2">
				<Button
					variant="ghost"
					class="w-full justify-start gap-3"
					href="/"
					onclick={() => authClient.signOut()}
				>
					<LogOut class="size-5 shrink-0" />
					{#if !collapsed}
						<span>Sign Out</span>
					{/if}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					class="mt-2 w-full justify-center"
					onclick={() => (collapsed = !collapsed)}
				>
					<ChevronLeft class="size-4 transition-transform" style={collapsed ? "transform: rotate(180deg)" : ""} />
				</Button>
			</div>
		</aside>

		<div class="flex flex-1 flex-col overflow-hidden">
			<header class="flex h-14 items-center border-b bg-card px-6">
				<div class="flex flex-1 items-center justify-between">
					<h1 class="text-lg font-medium">
						{navItems.find((item) => isActive(item.href))?.label ?? "Dashboard"}
					</h1>
					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">
							{$sessionQuery.data.user.name}
						</span>
					</div>
				</div>
			</header>
			<main class="flex-1 overflow-y-auto bg-background p-6">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
