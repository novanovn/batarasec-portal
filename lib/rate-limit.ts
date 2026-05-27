import { getValkeyClient } from "@/lib/valkey";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const valkey = getValkeyClient();
  const count = await valkey.incr(key);

  if (count === 1) {
    await valkey.expire(key, windowSeconds);
  }

  const ttl = await valkey.ttl(key);

  return {
    allowed: count <= limit,
    remaining: Math.max(limit - count, 0),
    resetSeconds: ttl > 0 ? ttl : windowSeconds,
  };
}
