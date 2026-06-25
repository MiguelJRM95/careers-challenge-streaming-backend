import type { NextFunction, Request, Response } from "express";
import { httpRequestDurationSeconds } from "../../../../config/metrics.ts";

/**
 * Per-route request duration timer (start on entry, stop on `finish`).
 * Mount on a specific router rather than globally so /metrics only carries
 * a histogram for the routes we actually care about (e.g. the alarm feed's
 * README p95 target), instead of every endpoint by default.
 */
export function requestDurationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path ?? req.path,
      status: res.statusCode,
    });
  });
  next();
}
