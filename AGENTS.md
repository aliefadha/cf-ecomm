# CF-Ecomm Project Documentation

## Overview

This is a monorepo ecommerce application built with the Better-T-Stack template, deployed on Cloudflare Workers/Pages using Alchemy.

---

## Project Structure

```
cf-ecomm/
├── apps/
│   ├── web/              # Frontend (SvelteKit)
│   └── server/           # Backend API (Hono + oRPC)
├── packages/
│   ├── api/              # oRPC router definitions
│   ├── auth/             # Better-Auth configuration
│   ├── config/           # Shared TypeScript config
│   ├── db/               # Drizzle ORM schema & migrations
│   ├── env/              # Environment variable types
│   └── infra/            # Alchemy deployment configuration
├── turbo.json            # Turborepo config
├── package.json          # Root workspace config
└── bts.jsonc             # Better-T-Stack metadata
```

---

## Tech Stack

### Core
- **Runtime**: Cloudflare Workers (Node.js compatibility)
- **Frontend**: SvelteKit with adapter-cloudflare
- **Backend**: Hono.js + oRPC (type-safe RPC API)
- **Database**: SQLite via D1 (Cloudflare's SQLite)
- **ORM**: Drizzle ORM
- **Auth**: Better-Auth
- **Validation**: Zod

### Infrastructure
- **Deployment**: Alchemy + Wrangler
- **Build**: Turborepo
- **Linting**: Biome

---

## Database Schema

Located in `packages/db/src/schema/`

### Auth Tables (Better-Auth)
- `user` - User accounts
- `session` - Auth sessions
- `account` - OAuth accounts
- `verification` - Email verification tokens

### Ecommerce Tables
- `category` - Product categories (supports nested via `parentId`)
- `product` - Products with name, slug, price, images, status
- `product_category` - Many-to-many product-category relationship
- `inventory` - Stock tracking (quantity, reserved, low-stock threshold)
- `cart` - Shopping carts (user-linked or session-based for guests)
- `cart_item` - Items in cart
- `address` - User addresses (shipping/billing)
- `order` - Customer orders with totals and status
- `order_item` - Order line items with price snapshot
- `order_address` - Order billing/shipping addresses (snapshot)

### Relations
- User → carts, addresses, orders (one-to-many)
- Product → categories, cartItems, orderItems, inventory (one-to-many/one-to-one)
- Category → products, parent/children (self-referencing)
- Order → items, addresses (one-to-many)

---

## API Structure

Located in `packages/api/src/routers/`

### Procedures
- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires authenticated session

### Routers
- `category.ts` - Category CRUD (public list/get, protected create/update/delete)
- `product.ts` - Product CRUD + inventory management
- `cart.ts` - Cart operations (get, addItem, updateItem, removeItem, clear, validateStock)
- `address.ts` - Address management (protected)
- `order.ts` - Order management + checkout (protected)

### Error Handling
Use `ORPCError` from `@orpc/server`:
```typescript
throw new ORPCError("NOT_FOUND", { message: "Resource not found" });
throw new ORPCError("BAD_REQUEST", { message: "Invalid input" });
throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
```

### oRPC API Endpoints
- RPC: `POST /rpc/<router>.<procedure>`
- OpenAPI Docs: `GET /api-reference`

---

## Environment Variables

### apps/web/.env
```
PUBLIC_SERVER_URL=https://cf-ecomm-server-aliefadha.alifadha1.workers.dev
```

### apps/server/.env
```
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=https://cf-ecomm-server-aliefadha.alifadha1.workers.dev
CORS_ORIGIN=https://cf-ecomm-web-aliefadha.alifadha1.workers.dev
```

### packages/infra/.env
```
ALCHEMY_PASSWORD=<password>
```

---

## Key Commands

```bash
# Install dependencies
bun install

# Development
bun run dev              # Start all apps
bun run dev:web          # Start frontend only
bun run dev:server       # Start backend only

# Build & Deploy
bun run build            # Build all apps
bun run deploy           # Deploy via Alchemy

# Database
bun run db:generate      # Generate Drizzle migration
bun run db:push          # Push schema to D1

# Code Quality
bun run check            # Biome format + lint
bun run check-types       # TypeScript type check
```

---

## Important Patterns

### Database Queries (Drizzle ORM)
```typescript
// List with relations
await db.query.category.findMany({ with: { parent: true, children: true } });

// Find by condition
await db.query.product.findFirst({ where: eq(product.id, id) });

// Insert with returning
const [created] = await db.insert(product).values(data).returning();

// Update
await db.update(product).set(data).where(eq(product.id, id)).returning();
```

### Input Validation (Zod)
```typescript
.input(z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  categoryIds: z.array(z.string()).default([]),
}));
```

### oRPC Handlers
```typescript
list: publicProcedure.handler(async () => { ... }),
get: publicProcedure.input(schema).handler(async ({ input }) => { ... }),
create: protectedProcedure.input(schema).handler(async ({ input }) => { ... }),
```

---

## Deployment

- **Web**: https://cf-ecomm-web-aliefadha.alifadha1.workers.dev
- **Server**: https://cf-ecomm-server-aliefadha.alifadha1.workers.dev

Deployed via `alchemy deploy` which uses Wrangler under the hood.

---

## Notes for AI Agents

1. **Do not use `turbo.json` tasks** - Use direct commands like `bun run deploy` instead
2. **Database changes** - Always run `bun run db:generate` after modifying schema files
3. **Cloudflare deployment** - Changes require `bun run deploy` to take effect
4. **Local development** - Use `bun run dev` which starts both frontend and backend
5. **Auth** - Better-Auth is pre-configured; session is available via `context.session` in protected procedures
