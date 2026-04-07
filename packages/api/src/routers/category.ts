import { z } from "zod";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { category } from "@cf-ecomm/db/schema/ecommerce";
import { publicProcedure, protectedProcedure } from "../index";
import { getDb, generateSlug, generateId } from "../utils";

export const categoryRouter = {
	list: publicProcedure.handler(async () => {
		const db = getDb();
		const result = await db.query.category.findMany({
			with: {
				parent: true,
				children: true,
			},
		});
		return result;
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
			const result = await db.query.category.findFirst({
				where: input.id
					? eq(category.id, input.id)
					: eq(category.slug, input.slug!),
				with: {
					parent: true,
					children: true,
					products: {
						with: {
							product: true,
						},
					},
				},
			});
			return result;
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				description: z.string().optional(),
				parentId: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();
			const id = generateId();
			const slug = `${generateSlug(input.name)}-${id.substring(0, 8)}`;

			const [created] = await db
				.insert(category)
				.values({
					id,
					name: input.name,
					slug,
					description: input.description,
					parentId: input.parentId,
				})
				.returning();

			return created;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(100).optional(),
				description: z.string().optional(),
				parentId: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();
			const { id, ...updates } = input;

			const [updated] = await db
				.update(category)
				.set(updates)
				.where(eq(category.id, id))
				.returning();

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			const db = getDb();
			await db.delete(category).where(eq(category.id, input.id));
			return { success: true };
		}),
};
