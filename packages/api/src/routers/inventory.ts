import { product } from "@cf-ecomm/db/schema/ecommerce";
import { like } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "../index";
import { getDb } from "../utils";

export const inventoryRouter = {
	list: publicProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					lowStockOnly: z.boolean().optional(),
					limit: z.number().min(1).max(100).default(100),
					offset: z.number().min(0).default(0),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const db = getDb();
			const conditions = [];

			if (input?.search) {
				conditions.push(like(product.name, `%${input.search}%`));
			}

			const allInventory = await db.query.inventory.findMany({
				with: {
					product: true,
				},
				orderBy: (inventory, { desc }) => [desc(inventory.updatedAt)],
			});

			let filtered = allInventory;
			if (input?.search) {
				filtered = filtered.filter((inv) =>
					inv.product?.name.toLowerCase().includes(input.search!.toLowerCase()),
				);
			}

			if (input?.lowStockOnly) {
				filtered = filtered.filter(
					(inv) => inv.quantity <= (inv.lowStockThreshold ?? 10),
				);
			}

			const total = filtered.length;
			const offset = input?.offset ?? 0;
			const limit = input?.limit ?? 100;
			const paginated = filtered.slice(offset, offset + limit);

			return {
				inventory: paginated,
				total,
			};
		}),
};
