import { createMiddleware } from "hono/factory";
import { errorResponse } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  by?: "ip" | "license";
};

type Env = {
  Variables: {
    license?: {
      licenseId: string;
    };
  };
};

export function rateLimit(options: RateLimitOptions) {
  return createMiddleware<Env>(async (c, next) => {
    const identity = options.by === "license"
      ? c.get("license")?.licenseId
      : getClientIp(c);

    if (!identity) {
      return c.json(errorResponse("RATE_LIMITED", "Rate limit identity is unavailable"), 429);
    }

    const result = await checkRateLimit(
      `rate:${options.keyPrefix}:${identity}`,
      options.limit,
      options.windowSeconds,
    );

    c.header("X-RateLimit-Limit", String(options.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.resetSeconds));

    if (!result.allowed) {
      return c.json(errorResponse("RATE_LIMITED", "Too many requests"), 429);
    }

    await next();
  });
}
