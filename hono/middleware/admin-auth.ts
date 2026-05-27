import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { accessCookieName, verifyAccessToken, type VerifiedAdminToken } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";

export type AdminContext = VerifiedAdminToken;

type Env = {
  Variables: {
    admin: AdminContext;
  };
};

export const adminAuth = createMiddleware<Env>(async (c, next) => {
  const token = getCookie(c, accessCookieName);

  if (!token) {
    return c.json(errorResponse("UNAUTHORIZED", "Missing admin access token"), 401);
  }

  try {
    const admin = await verifyAccessToken(token);
    c.set("admin", admin);
    await next();
  } catch {
    return c.json(errorResponse("UNAUTHORIZED", "Invalid admin access token"), 401);
  }
});
