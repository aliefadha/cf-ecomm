import { createDb } from "@cf-ecomm/db";

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
	if (!db) {
		db = createDb();
	}
	return db;
}

export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.substring(0, 50);
}

export function generateId(): string {
	return crypto.randomUUID();
}
