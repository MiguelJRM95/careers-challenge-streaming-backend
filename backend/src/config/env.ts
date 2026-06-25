export const env = {
  port: Number(process.env.PORT ?? 3000),
  bufferFlushThreshold: Number(process.env.BUFFER_FLUSH_THRESHOLD ?? 500),
  bufferFlushIntervalMs: Number(process.env.BUFFER_FLUSH_INTERVAL_MS ?? 100),
};
