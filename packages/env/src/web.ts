import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "PUBLIC_",
	client: {
		PUBLIC_SERVER_URL: z.url(),
	},
	// biome-ignore lint/suspicious/noExplicitAny: Vite's import.meta.env typing requires this
	runtimeEnv: (import.meta as any).env,
	emptyStringAsUndefined: true,
});
