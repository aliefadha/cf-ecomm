import {
	inventory,
	product,
	productCategory,
} from "@cf-ecomm/db/schema/ecommerce";
import { ORPCError } from "@orpc/server";
import { and, eq, like, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";
import { generateId, generateSlug, getDb } from "../utils";

export const productRouter = {
	list: publicProcedure
		.input(
			z
				.object({
					categoryId: z.string().optional(),
					status: z.enum(["draft", "active", "archived"]).optional(),
					search: z.string().optional(),
					limit: z.number().min(1).max(100).default(20),
					offset: z.number().min(0).default(0),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const db = getDb();
			const conditions = [];

			if (input?.status) {
				conditions.push(eq(product.status, input.status));
			}

			if (input?.search) {
				conditions.push(like(product.name, `%${input.search}%`));
			}

			const products = await db.query.product.findMany({
				where: conditions.length > 0 ? and(...conditions) : undefined,
				with: {
					categories: {
						with: {
							category: true,
						},
					},
					inventory: true,
				},
				limit: input?.limit ?? 20,
				offset: input?.offset ?? 0,
				orderBy: (product, { desc }) => [desc(product.createdAt)],
			});

			const total = await db
				.select({ count: sql<number>`count(*)` })
				.from(product)
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				products,
				total: total[0]?.count ?? 0,
			};
		}),

	get: publicProcedure
		.input(
			z.object({
				id: z.string().optional(),
				slug: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();
			if (!input.id && !input.slug) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Either id or slug must be provided",
				});
			}
			const result = await db.query.product.findFirst({
				where: input.id
					? eq(product.id, input.id)
					: // biome-ignore lint/style/noNonNullAssertion: checked above that if id is falsy, slug is truthy
						eq(product.slug, input.slug!),
				with: {
					categories: {
						with: {
							category: true,
						},
					},
					inventory: true,
				},
			});
			return result;
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(200),
				description: z.string().optional(),
				price: z.number().min(0),
				compareAtPrice: z.number().min(0).optional(),
				costPrice: z.number().min(0).optional(),
				sku: z.string().optional(),
				barcode: z.string().optional(),
				images: z.array(z.string()).default([]),
				weight: z.number().min(0).optional(),
				weightUnit: z.string().default("kg"),
				categoryIds: z.array(z.string()).default([]),
				inventory: z
					.object({
						quantity: z.number().min(0).default(0),
						lowStockThreshold: z.number().min(0).default(10),
					})
					.optional(),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();
			const productId = generateId();
			const slug = `${generateSlug(input.name)}-${productId.substring(0, 8)}`;

			await db
				.insert(product)
				.values({
					id: productId,
					name: input.name,
					slug,
					description: input.description,
					price: input.price,
					compareAtPrice: input.compareAtPrice,
					costPrice: input.costPrice,
					sku: input.sku,
					barcode: input.barcode,
					images: input.images,
					weight: input.weight,
					weightUnit: input.weightUnit,
					status: "draft",
				})
				.returning();

			if (input.categoryIds.length > 0) {
				await db.insert(productCategory).values(
					input.categoryIds.map((catId) => ({
						productId,
						categoryId: catId,
					})),
				);
			}

			if (input.inventory) {
				await db.insert(inventory).values({
					id: generateId(),
					productId,
					quantity: input.inventory.quantity,
					lowStockThreshold: input.inventory.lowStockThreshold,
				});
			}

			const result = await db.query.product.findFirst({
				where: eq(product.id, productId),
				with: {
					categories: { with: { category: true } },
					inventory: true,
				},
			});

			return result;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(200).optional(),
				description: z.string().optional(),
				price: z.number().min(0).optional(),
				compareAtPrice: z.number().min(0).optional(),
				costPrice: z.number().min(0).optional(),
				sku: z.string().optional(),
				barcode: z.string().optional(),
				images: z.array(z.string()).optional(),
				weight: z.number().min(0).optional(),
				weightUnit: z.string().optional(),
				status: z.enum(["draft", "active", "archived"]).optional(),
				categoryIds: z.array(z.string()).optional(),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();
			const { id, categoryIds, ...updates } = input;

			await db.update(product).set(updates).where(eq(product.id, id));

			if (categoryIds !== undefined) {
				await db
					.delete(productCategory)
					.where(eq(productCategory.productId, id));
				if (categoryIds.length > 0) {
					await db.insert(productCategory).values(
						categoryIds.map((catId) => ({
							productId: id,
							categoryId: catId,
						})),
					);
				}
			}

			const result = await db.query.product.findFirst({
				where: eq(product.id, id),
				with: {
					categories: { with: { category: true } },
					inventory: true,
				},
			});

			return result;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			const db = getDb();
			await db.delete(product).where(eq(product.id, input.id));
			return { success: true };
		}),

	updateInventory: protectedProcedure
		.input(
			z.object({
				productId: z.string(),
				quantity: z.number().min(0),
				lowStockThreshold: z.number().min(0).default(10),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();

			const existing = await db.query.inventory.findFirst({
				where: eq(inventory.productId, input.productId),
			});

			if (existing) {
				const [updated] = await db
					.update(inventory)
					.set({
						quantity: input.quantity,
						lowStockThreshold: input.lowStockThreshold,
					})
					.where(eq(inventory.productId, input.productId))
					.returning();
				return updated;
			}

			const [created] = await db
				.insert(inventory)
				.values({
					id: generateId(),
					productId: input.productId,
					quantity: input.quantity,
					lowStockThreshold: input.lowStockThreshold,
				})
				.returning();
			return created;
		}),
};
