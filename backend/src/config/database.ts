import { Pool } from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

// A single Client only ever holds one connection, so concurrent queries on
// it queue implicitly on the wire - exactly what triggers pg's "client
// already executing a query" deprecation warning once the worker fires
// several alarm inserts without awaiting them (e.g. a fall_warn burst).
// Pool hands each concurrent query its own connection instead.
export const db = new Pool({ connectionString: env.databaseUrl, max: env.dbPoolMax });

export async function connectDatabase(): Promise<void> {
  const client = await db.connect();
  client.release();
  logger.info("connected to PostgreSQL");
}
