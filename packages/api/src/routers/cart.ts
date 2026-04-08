import { cart, cartItem } from "@cf-ecomm/db/schema/ecommerce";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "../index";
import { generateId, getDb } from "../utils";

export const cartRouter = {
	get: publicProcedure
		.input(
			z
				.object({
					sessionId: z.string().optional(),
				})
				.optional(),
		)
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session?.user?.id;
			const sessionId = input?.sessionId;

			if (!userId && !sessionId) {
				return null;
			}

			const result = await db.query.cart.findFirst({
				where: userId
					? eq(cart.userId, userId)
					: sessionId
						? eq(cart.sessionId, sessionId)
						: undefined,
				with: {
					items: {
						with: {
							product: {
								with: {
									inventory: true,
								},
							},
						},
					},
				},
			});

			return result;
		}),

	create: publicProcedure
		.input(
			z.object({
				sessionId: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session?.user?.id;

			const id = generateId();
			const [created] = await db
				.insert(cart)
				.values({
					id,
					userId,
					sessionId: input.sessionId,
				})
				.returning();

			return created;
		}),

	addItem: publicProcedure
		.input(
			z.object({
				cartId: z.string(),
				productId: z.string(),
				quantity: z.number().min(1).default(1),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();

			const existingItem = await db.query.cartItem.findFirst({
				where: and(
					eq(cartItem.cartId, input.cartId),
					eq(cartItem.productId, input.productId),
				),
			});

			if (existingItem) {
				const [updated] = await db
					.update(cartItem)
					.set({ quantity: existingItem.quantity + input.quantity })
					.where(eq(cartItem.id, existingItem.id))
					.returning();
				return updated;
			}

			const [created] = await db
				.insert(cartItem)
				.values({
					id: generateId(),
					cartId: input.cartId,
					productId: input.productId,
					quantity: input.quantity,
				})
				.returning();

			return created;
		}),

	updateItem: publicProcedure
		.input(
			z.object({
				itemId: z.string(),
				quantity: z.number().min(0),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();

			if (input.quantity === 0) {
				await db.delete(cartItem).where(eq(cartItem.id, input.itemId));
				return { success: true };
			}

			const [updated] = await db
				.update(cartItem)
				.set({ quantity: input.quantity })
				.where(eq(cartItem.id, input.itemId))
				.returning();

			return updated;
		}),

	removeItem: publicProcedure
		.input(z.object({ itemId: z.string() }))
		.handler(async ({ input }) => {
			const db = getDb();
			await db.delete(cartItem).where(eq(cartItem.id, input.itemId));
			return { success: true };
		}),

	clear: publicProcedure
		.input(z.object({ cartId: z.string() }))
		.handler(async ({ input }) => {
			const db = getDb();
			await db.delete(cartItem).where(eq(cartItem.cartId, input.cartId));
			return { success: true };
		}),

	validateStock: publicProcedure
		.input(z.object({ cartId: z.string() }))
		.handler(async ({ input }) => {
			const db = getDb();

			const cartItems = await db.query.cartItem.findMany({
				where: eq(cartItem.cartId, input.cartId),
				with: {
					product: {
						with: {
							inventory: true,
						},
					},
				},
			});

			const unavailable: Array<{
				productId: string;
				name: string;
				requested: number;
				available: number;
			}> = [];

			for (const item of cartItems) {
				const available = item.product.inventory?.quantity ?? 0;
				if (item.quantity > available) {
					unavailable.push({
						productId: item.productId,
						name: item.product.name,
						requested: item.quantity,
						available,
					});
				}
			}

			return {
				valid: unavailable.length === 0,
				unavailable,
			};
		}),
};
