export const env = {
  port: Number(process.env.PORT ?? 3000),
  bufferFlushThreshold: Number(process.env.BUFFER_FLUSH_THRESHOLD ?? 500),
  bufferFlushIntervalMs: Number(process.env.BUFFER_FLUSH_INTERVAL_MS ?? 100),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/challenge",
  dbPoolMax: Number(process.env.DB_POOL_MAX ?? 20),
  logLevel: process.env.LOG_LEVEL ?? "info",
};
