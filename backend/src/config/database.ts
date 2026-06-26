import { Pool } from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

// Pool hands each concurrent query its own connection instead.
export const db = new Pool({ connectionString: env.databaseUrl, max: env.dbPoolMax });

export async function connectDatabase(): Promise<void> {
  const client = await db.connect();
  client.release();
  logger.info("connected to PostgreSQL");
}
