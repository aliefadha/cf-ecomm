<script lang="ts">
import { Loader2, Upload, X } from "@lucide/svelte";
import { createMutation } from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { orpc } from "$lib/orpc";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
];

interface Props {
	productId: string;
	images?: string[];
	onImagesChange?: (images: string[]) => void;
}

let { productId, images = [], onImagesChange }: Props = $props();

let uploading = $state(false);
let fileInput: HTMLInputElement;

const uploadMutation = createMutation(
	orpc.upload.upload.mutationOptions({
		onSuccess: (data) => {
			onImagesChange?.([...images, data.publicUrl]);
			toast.success("Image uploaded");
		},
		onError: (error) => {
			console.error("Upload failed:", error);
			const message = error.message || "Failed to upload image";
			toast.error(message);
		},
		onSettled: () => {
			uploading = false;
		},
	}),
);

async function handleFileSelect(e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	if (!ACCEPTED_TYPES.includes(file.type)) {
		toast.error(
			"Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF, or AVIF).",
		);
		return;
	}

	if (file.size > MAX_FILE_SIZE) {
		toast.error("File too large. Maximum size is 5MB.");
		return;
	}

	uploading = true;

	const fileData = await fileToBase64(file);

	$uploadMutation.mutate({
		productId,
		filename: file.name,
		contentType: file.type,
		fileData,
	});

	input.value = "";
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(",")[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function removeImage(index: number) {
	const newImages = images.filter((_, i) => i !== index);
	onImagesChange?.(newImages);
}
</script>

<div class="space-y-2">
	<div class="flex flex-wrap gap-2">
		{#each images as image, i}
			<div class="relative group">
				<img src={image} alt="" class="size-20 rounded-lg object-cover border" />
				<button
					type="button"
					class="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
					onclick={() => removeImage(i)}
				>
					<X class="size-3" />
				</button>
			</div>
		{/each}

		<button
			type="button"
			class="size-20 rounded-lg border border-dashed flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
			onclick={() => fileInput?.click()}
			disabled={$uploadMutation.isPending}
		>
			{#if $uploadMutation.isPending}
				<Loader2 class="size-5 text-muted-foreground animate-spin" />
			{:else}
				<Upload class="size-5 text-muted-foreground" />
			{/if}
		</button>
	</div>

	<p class="text-xs text-muted-foreground">
		Upload images up to 5MB. Accepted formats: JPEG, PNG, WebP, GIF, AVIF.
	</p>

	<input
		bind:this={fileInput}
		type="file"
		accept={ACCEPTED_TYPES.join(",")}
		class="hidden"
		onchange={handleFileSelect}
	/>
</div>
