import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;

// Raw client for query-template usage (e.g. queue inspection)
export { client as dbClient };
