import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let poolInstance: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

export function getPool(): Pool {
  if (!poolInstance) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }

    poolInstance = new Pool({
      connectionString: databaseUrl,
    });
  }

  return poolInstance;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }

  return dbInstance;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    return Reflect.get(getPool(), property, receiver);
  },
});
