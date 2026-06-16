import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Use globalThis to survive Next.js hot-reloads in dev without leaking connections.
const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql };

const client = globalForDb._pgClient ?? postgres(env.DATABASE_URL, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;

// Raw client for query-template usage (e.g. queue inspection)
export { client as dbClient };
