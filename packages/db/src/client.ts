import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as relations from "./relations.ts";
import * as schema from "./schema.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy apps/web/.env.example to apps/web/.env.local.");
}

// In development, a change of a file loads this module again. Without the global value, each
// load opens new connections and the old connections stay open.
const globalForDb = globalThis as unknown as {
  demetraDbClient?: ReturnType<typeof postgres>;
};

const client = globalForDb.demetraDbClient ?? postgres(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDb.demetraDbClient = client;
}

/**
 * The Drizzle client. Server code only: the browser cannot connect to the database.
 *
 * It works with the local database (container `demetra-db`) and with a Neon connection string.
 * Drizzle only reads the tables: the data pipeline makes and loads them.
 */
export const db = drizzle(client, { schema: { ...schema, ...relations } });
