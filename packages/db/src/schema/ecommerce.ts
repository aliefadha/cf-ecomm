import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const category = sqliteTable("category", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description"),
	parentId: text("parent_id").references(
		(): ReturnType<typeof text> => category.id,
		{ onDelete: "set null" },
	),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const product = sqliteTable("product", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description"),
	price: real("price").notNull(),
	compareAtPrice: real("compare_at_price"),
	costPrice: real("cost_price"),
	sku: text("sku").unique(),
	barcode: text("barcode"),
	images: text("images", { mode: "json" }).$type<string[]>().default([]),
	weight: real("weight"),
	weightUnit: text("weight_unit").default("kg"),
	status: text("status", { enum: ["draft", "active", "archived"] })
		.default("draft")
		.notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const productCategory = sqliteTable(
	"product_category",
	{
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		categoryId: text("category_id")
			.notNull()
			.references(() => category.id, { onDelete: "cascade" }),
	},
	(table) => [index("product_category_product_idx").on(table.productId)],
);

export const inventory = sqliteTable("inventory", {
	id: text("id").primaryKey(),
	productId: text("product_id")
		.notNull()
		.references(() => product.id, { onDelete: "cascade" })
		.unique(),
	quantity: integer("quantity").notNull().default(0),
	reservedQuantity: integer("reserved_quantity").notNull().default(0),
	lowStockThreshold: integer("low_stock_threshold").default(10),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const cart = sqliteTable("cart", {
	id: text("id").primaryKey(),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	sessionId: text("session_id"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const cartItem = sqliteTable(
	"cart_item",
	{
		id: text("id").primaryKey(),
		cartId: text("cart_id")
			.notNull()
			.references(() => cart.id, { onDelete: "cascade" }),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		quantity: integer("quantity").notNull().default(1),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("cart_item_cart_idx").on(table.cartId),
		index("cart_item_product_idx").on(table.productId),
	],
);

export const address = sqliteTable(
	"address",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		firstName: text("first_name").notNull(),
		lastName: text("last_name").notNull(),
		street: text("street").notNull(),
		street2: text("street2"),
		city: text("city").notNull(),
		state: text("state").notNull(),
		postalCode: text("postal_code").notNull(),
		country: text("country").notNull(),
		phone: text("phone"),
		isDefault: integer("is_default", { mode: "boolean" })
			.default(false)
			.notNull(),
		type: text("type", { enum: ["shipping", "billing", "both"] })
			.default("both")
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("address_user_idx").on(table.userId)],
);

export const order = sqliteTable(
	"order",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		status: text("status", {
			enum: [
				"pending",
				"confirmed",
				"processing",
				"shipped",
				"delivered",
				"cancelled",
				"refunded",
			],
		})
			.default("pending")
			.notNull(),
		totalAmount: real("total_amount").notNull(),
		subtotalAmount: real("subtotal_amount").notNull(),
		taxAmount: real("tax_amount").default(0),
		shippingAmount: real("shipping_amount").default(0),
		discountAmount: real("discount_amount").default(0),
		currency: text("currency").default("USD").notNull(),
		itemsCount: integer("items_count").notNull().default(0),
		notes: text("notes"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("order_user_idx").on(table.userId)],
);

export const orderItem = sqliteTable(
	"order_item",
	{
		id: text("id").primaryKey(),
		orderId: text("order_id")
			.notNull()
			.references(() => order.id, { onDelete: "cascade" }),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "restrict" }),
		quantity: integer("quantity").notNull(),
		priceAtPurchase: real("price_at_purchase").notNull(),
		totalPrice: real("total_price").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("order_item_order_idx").on(table.orderId)],
);

export const orderAddress = sqliteTable(
	"order_address",
	{
		id: text("id").primaryKey(),
		orderId: text("order_id")
			.notNull()
			.references(() => order.id, { onDelete: "cascade" }),
		type: text("type", { enum: ["billing", "shipping"] }).notNull(),
		firstName: text("first_name").notNull(),
		lastName: text("last_name").notNull(),
		street: text("street").notNull(),
		street2: text("street2"),
		city: text("city").notNull(),
		state: text("state").notNull(),
		postalCode: text("postal_code").notNull(),
		country: text("country").notNull(),
		phone: text("phone"),
	},
	(table) => [index("order_address_order_idx").on(table.orderId)],
);

export const categoryRelations = relations(category, ({ one, many }) => ({
	parent: one(category, {
		fields: [category.parentId],
		references: [category.id],
		relationName: "categoryParent",
	}),
	children: many(category, {
		relationName: "categoryParent",
	}),
	products: many(productCategory),
}));

export const productRelations = relations(product, ({ one, many }) => ({
	categories: many(productCategory),
	cartItems: many(cartItem),
	orderItems: many(orderItem),
	inventory: one(inventory, {
		fields: [product.id],
		references: [inventory.productId],
	}),
}));

export const productCategoryRelations = relations(
	productCategory,
	({ one }) => ({
		product: one(product, {
			fields: [productCategory.productId],
			references: [product.id],
		}),
		category: one(category, {
			fields: [productCategory.categoryId],
			references: [category.id],
		}),
	}),
);

export const inventoryRelations = relations(inventory, ({ one }) => ({
	product: one(product, {
		fields: [inventory.productId],
		references: [product.id],
	}),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
	user: one(user, {
		fields: [cart.userId],
		references: [user.id],
	}),
	items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
	cart: one(cart, {
		fields: [cartItem.cartId],
		references: [cart.id],
	}),
	product: one(product, {
		fields: [cartItem.productId],
		references: [product.id],
	}),
}));

export const addressRelations = relations(address, ({ one }) => ({
	user: one(user, {
		fields: [address.userId],
		references: [user.id],
	}),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
	user: one(user, {
		fields: [order.userId],
		references: [user.id],
	}),
	items: many(orderItem),
	addresses: many(orderAddress),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
	order: one(order, {
		fields: [orderItem.orderId],
		references: [order.id],
	}),
	product: one(product, {
		fields: [orderItem.productId],
		references: [product.id],
	}),
}));

export const orderAddressRelations = relations(orderAddress, ({ one }) => ({
	order: one(order, {
		fields: [orderAddress.orderId],
		references: [order.id],
	}),
}));
