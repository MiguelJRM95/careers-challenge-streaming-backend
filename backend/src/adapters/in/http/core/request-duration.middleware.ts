import type { NextFunction, Request, Response } from "express";
import { httpRequestDurationSeconds } from "../../../../config/metrics.ts";

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
