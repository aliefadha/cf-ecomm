import { z } from "zod";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import {
	order,
	orderItem,
	orderAddress,
	cart,
	cartItem,
	inventory,
} from "@cf-ecomm/db/schema/ecommerce";
import { protectedProcedure } from "../index";
import { getDb, generateId } from "../utils";

const orderAddressInput = z.object({
	type: z.enum(["billing", "shipping"]),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	street: z.string().min(1),
	street2: z.string().optional(),
	city: z.string().min(1),
	state: z.string().min(1),
	postalCode: z.string().min(1),
	country: z.string().min(1),
	phone: z.string().optional(),
});

export const orderRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const db = getDb();
		const userId = context.session.user.id;

		const result = await db.query.order.findMany({
			where: eq(order.userId, userId),
			with: {
				items: {
					with: {
						product: true,
					},
				},
				addresses: true,
			},
			orderBy: (order, { desc }) => [desc(order.createdAt)],
		});

		return result;
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;

			const result = await db.query.order.findFirst({
				where: eq(order.id, input.id),
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
					addresses: true,
				},
			});

			if (result && result.userId !== userId) {
				throw new ORPCError("NOT_FOUND", {
					message: "Order not found",
				});
			}

			return result;
		}),

	create: protectedProcedure
		.input(
			z.object({
				cartId: z.string(),
				billingAddress: orderAddressInput,
				shippingAddress: orderAddressInput,
				notes: z.string().optional(),
				currency: z.string().default("USD"),
			}),
		)
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;

			const cartData = await db.query.cart.findFirst({
				where: eq(cart.id, input.cartId),
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

			if (!cartData || cartData.items.length === 0) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Cart is empty",
				});
			}

			for (const item of cartData.items) {
				const available = item.product.inventory?.quantity ?? 0;
				if (item.quantity > available) {
					throw new ORPCError("BAD_REQUEST", {
						message: `Insufficient stock for ${item.product.name}`,
					});
				}
			}

			const subtotalAmount = cartData.items.reduce(
				(sum, item) => sum + item.product.price * item.quantity,
				0,
			);

			const orderId = generateId();

			await db
				.insert(order)
				.values({
					id: orderId,
					userId,
					subtotalAmount,
					totalAmount: subtotalAmount,
					itemsCount: cartData.items.reduce(
						(sum, item) => sum + item.quantity,
						0,
					),
					notes: input.notes,
					currency: input.currency,
				})
				.returning();

			for (const item of cartData.items) {
				const totalPrice = item.product.price * item.quantity;

				await db.insert(orderItem).values({
					id: generateId(),
					orderId,
					productId: item.productId,
					quantity: item.quantity,
					priceAtPurchase: item.product.price,
					totalPrice,
				});

				await db
					.update(inventory)
					.set({
						quantity: (item.product.inventory?.quantity ?? 0) - item.quantity,
					})
					.where(eq(inventory.productId, item.productId));
			}

			await db.insert(orderAddress).values({
				id: generateId(),
				orderId,
				...input.billingAddress,
			});

			await db.insert(orderAddress).values({
				id: generateId(),
				orderId,
				...input.shippingAddress,
			});

			await db.delete(cartItem).where(eq(cartItem.cartId, input.cartId));

			const result = await db.query.order.findFirst({
				where: eq(order.id, orderId),
				with: {
					items: {
						with: {
							product: true,
						},
					},
					addresses: true,
				},
			});

			return result;
		}),

	updateStatus: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				status: z.enum([
					"pending",
					"confirmed",
					"processing",
					"shipped",
					"delivered",
					"cancelled",
					"refunded",
				]),
			}),
		)
		.handler(async ({ input }) => {
			const db = getDb();

			const [updated] = await db
				.update(order)
				.set({ status: input.status })
				.where(eq(order.id, input.id))
				.returning();

			return updated;
		}),

	cancel: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;

			const existingOrder = await db.query.order.findFirst({
				where: eq(order.id, input.id),
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

			if (!existingOrder || existingOrder.userId !== userId) {
				throw new ORPCError("NOT_FOUND", {
					message: "Order not found",
				});
			}

			if (existingOrder.status !== "pending") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Only pending orders can be cancelled",
				});
			}

			for (const item of existingOrder.items) {
				await db
					.update(inventory)
					.set({
						quantity: (item.product.inventory?.quantity ?? 0) + item.quantity,
					})
					.where(eq(inventory.productId, item.productId));
			}

			const [updated] = await db
				.update(order)
				.set({ status: "cancelled" })
				.where(eq(order.id, input.id))
				.returning();

			return updated;
		}),
};
