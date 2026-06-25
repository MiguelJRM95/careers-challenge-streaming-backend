import { buildApp } from "./config/bootstrap.js";
import { connectDatabase } from "./config/database.js";
import { logger } from "./config/logger.js";

const { httpServer } = buildApp();

await connectDatabase().catch((err: unknown) => {
  logger.error("failed to connect to PostgreSQL", { err });
  process.exit(1);
});

httpServer.start();
