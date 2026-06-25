import { Client } from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const db = new Client({ connectionString: env.databaseUrl });

export async function connectDatabase(): Promise<void> {
  await db.connect();
  logger.info("connected to PostgreSQL");
}
