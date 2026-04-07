import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { categoryRouter } from "./category";
import { productRouter } from "./product";
import { cartRouter } from "./cart";
import { addressRouter } from "./address";
import { orderRouter } from "./order";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	category: categoryRouter,
	product: productRouter,
	cart: cartRouter,
	address: addressRouter,
	order: orderRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
