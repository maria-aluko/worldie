import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

declare global {
  var __worldie_db__: DB | undefined;
}

function create(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Supabase Postgres URL.",
    );
  }
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

/**
 * Lazy singleton: the real connection is created only on first property access,
 * so the module can be imported during build/typecheck without a live DB.
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const instance = (globalThis.__worldie_db__ ??= create());
    return Reflect.get(instance, prop, receiver);
  },
});

export { schema };
