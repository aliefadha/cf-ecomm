import { z } from "zod";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { address } from "@cf-ecomm/db/schema/ecommerce";
import { protectedProcedure } from "../index";
import { getDb, generateId } from "../utils";

export const addressRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const db = getDb();
		const userId = context.session.user.id;

		const result = await db.query.address.findMany({
			where: eq(address.userId, userId),
		});

		return result;
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;

			const result = await db.query.address.findFirst({
				where: eq(address.id, input.id),
			});

			if (result && result.userId !== userId) {
				throw new ORPCError("NOT_FOUND", {
					message: "Address not found",
				});
			}

			return result;
		}),

	create: protectedProcedure
		.input(
			z.object({
				firstName: z.string().min(1),
				lastName: z.string().min(1),
				street: z.string().min(1),
				street2: z.string().optional(),
				city: z.string().min(1),
				state: z.string().min(1),
				postalCode: z.string().min(1),
				country: z.string().min(1),
				phone: z.string().optional(),
				type: z.enum(["shipping", "billing", "both"]).default("both"),
				isDefault: z.boolean().default(false),
			}),
		)
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;

			if (input.isDefault) {
				await db
					.update(address)
					.set({ isDefault: false })
					.where(eq(address.userId, userId));
			}

			const [created] = await db
				.insert(address)
				.values({
					id: generateId(),
					userId,
					...input,
				})
				.returning();

			return created;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				firstName: z.string().min(1).optional(),
				lastName: z.string().min(1).optional(),
				street: z.string().min(1).optional(),
				street2: z.string().optional(),
				city: z.string().min(1).optional(),
				state: z.string().min(1).optional(),
				postalCode: z.string().min(1).optional(),
				country: z.string().min(1).optional(),
				phone: z.string().optional(),
				type: z.enum(["shipping", "billing", "both"]).optional(),
				isDefault: z.boolean().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;
			const { id, ...updates } = input;

			const existing = await db.query.address.findFirst({
				where: eq(address.id, id),
			});

			if (!existing || existing.userId !== userId) {
				throw new ORPCError("NOT_FOUND", {
					message: "Address not found",
				});
			}

			if (updates.isDefault) {
				await db
					.update(address)
					.set({ isDefault: false })
					.where(eq(address.userId, userId));
			}

			const [updated] = await db
				.update(address)
				.set(updates)
				.where(eq(address.id, id))
				.returning();

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;

			const existing = await db.query.address.findFirst({
				where: eq(address.id, input.id),
			});

			if (!existing || existing.userId !== userId) {
				throw new ORPCError("NOT_FOUND", {
					message: "Address not found",
				});
			}

			await db.delete(address).where(eq(address.id, input.id));
			return { success: true };
		}),

	setDefault: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				isDefault: z.boolean(),
			}),
		)
		.handler(async ({ context, input }) => {
			const db = getDb();
			const userId = context.session.user.id;

			if (input.isDefault) {
				await db
					.update(address)
					.set({ isDefault: false })
					.where(eq(address.userId, userId));
			}

			const [updated] = await db
				.update(address)
				.set({ isDefault: input.isDefault })
				.where(eq(address.id, input.id))
				.returning();

			return updated;
		}),
};
