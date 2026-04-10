import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { generateId } from "../utils";

const ALLOWED_CONTENT_TYPES = ["image/"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const uploadRouter = {
	upload: protectedProcedure
		.input(
			z.object({
				productId: z.string().min(1),
				filename: z.string().min(1),
				contentType: z
					.string()
					.refine(
						(ct) => ALLOWED_CONTENT_TYPES.some((type) => ct.startsWith(type)),
						"Only image files are allowed",
					),
				fileData: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			const ext = input.filename.split(".").pop() || "jpg";
			const objectKey = `products/${input.productId}/${generateId()}.${ext}`;

			const publicUrl = await uploadFile(
				objectKey,
				input.contentType,
				input.fileData,
			);

			return { objectKey, publicUrl };
		}),

	deleteFile: protectedProcedure
		.input(z.object({ objectKey: z.string() }))
		.handler(async ({ input }) => {
			await deleteFile(input.objectKey);
			return { success: true };
		}),
};

async function uploadFile(
	objectKey: string,
	contentType: string,
	fileData: string,
): Promise<string> {
	const { env } = await import("@cf-ecomm/env/server");
	const bucket = env.PRODUCT_IMAGES;

	if (!bucket) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Product images bucket not configured",
		});
	}

	const binaryData = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));

	await bucket.put(objectKey, binaryData, {
		httpMetadata: { contentType },
	});

	const publicUrl = `${env.R2_PUBLIC_BUCKET_URL}/${objectKey}`;

	return publicUrl;
}

async function deleteFile(objectKey: string): Promise<void> {
	const { env } = await import("@cf-ecomm/env/server");
	const bucket = env.PRODUCT_IMAGES;

	if (!bucket) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Product images bucket not configured",
		});
	}

	await bucket.delete(objectKey);
}
