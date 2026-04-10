<script lang="ts">
import { ArrowLeft, Package } from "@lucide/svelte";
import { createQuery, useQueryClient } from "@tanstack/svelte-query";
import { page } from "$app/stores";
import ProductForm from "$lib/components/product-form.svelte";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";
import { Separator } from "$lib/components/ui/separator";
import { Skeleton } from "$lib/components/ui/skeleton";
import { orpc } from "$lib/orpc";

const qc = useQueryClient();

const productQuery = createQuery(
	orpc.product.get.queryOptions({
		input: { id: $page.params.id },
		enabled: !!$page.params.id,
	}),
);

const product = $derived($productQuery.data);
</script>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <Button variant="ghost" size="icon" href="/dashboard/products">
      <ArrowLeft class="size-4" />
    </Button>
    <div>
      <h2 class="text-lg font-medium">Product Details</h2>
      <p class="text-sm text-muted-foreground">
        View and manage product information
      </p>
    </div>
  </div>

  {#if $productQuery.isPending}
    <div class="grid gap-6 lg:grid-cols-2">
      <Card.Root>
        <Card.Header>
          <Skeleton class="h-6 w-32" />
        </Card.Header>
        <Card.Content class="space-y-4">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-1/2" />
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header>
          <Skeleton class="h-6 w-24" />
        </Card.Header>
        <Card.Content>
          <Skeleton class="h-20 w-20" />
        </Card.Content>
      </Card.Root>
    </div>
  {:else if !product}
    <Card.Root>
      <Card.Content class="flex h-60 items-center justify-center">
        <div class="text-center">
          <Package class="mx-auto mb-2 size-8 text-muted-foreground/50" />
          <p class="text-muted-foreground">Product not found</p>
          <Button variant="link" href="/dashboard/products" class="mt-2">
            Back to Products
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <div class="grid gap-6 lg:grid-cols-2">
      <Card.Root>
        <Card.Header>
          <div class="flex items-center justify-between">
            <Card.Title>Product Information</Card.Title>
            <ProductForm {product} />
          </div>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="flex items-start gap-4">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-lg bg-muted"
            >
              {#if product.images && product.images.length > 0}
                <img
                  src={product.images[0]}
                  alt={product.name}
                  class="size-18 rounded object-cover"
                />
              {:else}
                <Package class="size-8 text-muted-foreground" />
              {/if}
            </div>
            <div class="flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-semibold">{product.name}</h3>
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
              <p class="text-sm text-muted-foreground">
                {product.slug}
              </p>
            </div>
          </div>

          <Separator />

          {#if product.description}
            <div>
              <p class="text-sm font-medium">Description</p>
              <p class="text-sm text-muted-foreground">
                {product.description}
              </p>
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium">Price</p>
              <p class="text-2xl font-bold">
                ${product.price.toFixed(2)}
              </p>
              {#if product.compareAtPrice}
                <p class="text-sm text-muted-foreground line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </p>
              {/if}
            </div>
            <div>
              <p class="text-sm font-medium">SKU</p>
              <p class="text-sm">{product.sku ?? "Not set"}</p>
            </div>
            <div>
              <p class="text-sm font-medium">Barcode</p>
              <p class="text-sm">{product.barcode ?? "Not set"}</p>
            </div>
            <div>
              <p class="text-sm font-medium">Weight</p>
              <p class="text-sm">
                {#if product.weight}
                  {product.weight} {product.weightUnit ?? "kg"}
                {:else}
                  Not set
                {/if}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <div class="space-y-6">
        <Card.Root>
          <Card.Header>
            <Card.Title>Inventory</Card.Title>
          </Card.Header>
          <Card.Content>
            {#if product.inventory}
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm">Quantity</span>
                  <span class="text-2xl font-bold">
                    {product.inventory.quantity}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm">Low Stock Alert</span>
                  <span class="text-sm">
                    {product.inventory.lowStockThreshold ?? 10}
                  </span>
                </div>
                {#if product.inventory.quantity <= (product.inventory.lowStockThreshold ?? 10)}
                  <Badge variant="destructive" class="mt-2">
                    Low Stock Warning
                  </Badge>
                {/if}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">No inventory data</p>
            {/if}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Categories</Card.Title>
          </Card.Header>
          <Card.Content>
            {#if product.categories && product.categories.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each product.categories as { category }}
                  <Badge variant="secondary">
                    {category.name}
                  </Badge>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">
                No categories assigned
              </p>
            {/if}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Images</Card.Title>
          </Card.Header>
          <Card.Content>
            {#if product.images && product.images.length > 0}
              <div class="grid grid-cols-3 gap-2">
                {#each product.images as image}
                  <img
                    src={image}
                    alt=""
                    class="aspect-square rounded-lg object-cover border"
                  />
                {/each}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">No images uploaded</p>
            {/if}
          </Card.Content>
        </Card.Root>
      </div>
    </div>

    <Card.Root>
      <Card.Header>
        <Card.Title>Metadata</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-4 text-sm lg:grid-cols-2">
          <div>
            <p class="font-medium">Created</p>
            <p class="text-muted-foreground">
              {product.createdAt.toLocaleDateString()} at{" "}
              {product.createdAt.toLocaleTimeString()}
            </p>
          </div>
          <div>
            <p class="font-medium">Last Updated</p>
            <p class="text-muted-foreground">
              {product.updatedAt.toLocaleDateString()} at{" "}
              {product.updatedAt.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
