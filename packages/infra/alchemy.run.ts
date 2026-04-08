import alchemy from "alchemy";
import { D1Database, SvelteKit, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

const stage = process.env.STAGE || "dev";

config({ path: "./.env" });
config({ path: `./.env.${stage}` });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });
config({ path: `../../apps/web/.env.${stage}` });
config({ path: `../../apps/server/.env.${stage}` });

const app = await alchemy("cf-ecomm", {
	stage,
	password: process.env.ALCHEMY_PASSWORD,
});

const db = await D1Database("database", {
	migrationsDir: "../../packages/db/src/migrations",
});

export const web = await SvelteKit("web", {
	cwd: "../../apps/web",
	bindings: {
		// biome-ignore lint/style/noNonNullAssertion: env vars are loaded via dotenv before this
		PUBLIC_SERVER_URL: alchemy.env.PUBLIC_SERVER_URL!,
	},
});

export const server = await Worker("server", {
	cwd: "../../apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	bindings: {
		DB: db,
		// biome-ignore lint/style/noNonNullAssertion: env vars are loaded via dotenv before this
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		// biome-ignore lint/style/noNonNullAssertion: env vars are loaded via dotenv before this
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		// biome-ignore lint/style/noNonNullAssertion: env vars are loaded via dotenv before this
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
	},
	dev: {
		port: 3000,
	},
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
