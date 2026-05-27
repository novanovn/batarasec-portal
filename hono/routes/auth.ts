import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { db } from "@/db";
import { portalAdmins } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  accessCookieName,
  getAccessMaxAge,
  getRefreshMaxAge,
  refreshCookieName,
  revokeSession,
  revokeToken,
  shouldUseSecureCookies,
  signAdminTokens,
  verifyRefreshToken,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/request";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256),
});

function setAuthCookies(c: Context, accessToken: string, refreshToken: string) {
  const secure = shouldUseSecureCookies();

  setCookie(c, accessCookieName, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: getAccessMaxAge(),
  });

  setCookie(c, refreshCookieName, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "Strict",
    path: "/",
    maxAge: getRefreshMaxAge(),
  });
}

function clearAuthCookies(c: Context) {
  deleteCookie(c, accessCookieName, { path: "/" });
  deleteCookie(c, refreshCookieName, { path: "/" });
}

export const authRoute = new Hono()
  .post("/login", async (c) => {
    const ipAddress = getClientIp(c);
    const userAgent = getUserAgent(c);
    const rateLimit = await checkRateLimit(`rate:auth:login:${ipAddress}`, 5, 15 * 60);

    if (!rateLimit.allowed) {
      return c.json(errorResponse("RATE_LIMITED", "Too many login attempts"), 429);
    }

    const payload = loginSchema.safeParse(await c.req.json().catch(() => null));

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid login payload"), 400);
    }

    const email = payload.data.email.toLowerCase();
    const admin = await db.query.portalAdmins.findFirst({
      where: eq(portalAdmins.email, email),
    });

    if (!admin) {
      await writeAuditLog({
        actor: email,
        action: "failed_login",
        metadata: { reason: "invalid_credentials" },
        ipAddress,
        userAgent,
      });

      return c.json(errorResponse("UNAUTHORIZED", "Invalid email or password"), 401);
    }

    const passwordValid = await argon2.verify(admin.passwordHash, payload.data.password);

    if (!passwordValid) {
      await writeAuditLog({
        actor: admin.email,
        action: "failed_login",
        target: admin.id,
        metadata: { reason: "invalid_credentials" },
        ipAddress,
        userAgent,
      });

      return c.json(errorResponse("UNAUTHORIZED", "Invalid email or password"), 401);
    }

    const tokens = await signAdminTokens({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    await db
      .update(portalAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(portalAdmins.id, admin.id));

    await writeAuditLog({
      actor: admin.email,
      action: "login",
      target: admin.id,
      metadata: { sessionId: tokens.sessionId },
      ipAddress,
      userAgent,
    });

    setAuthCookies(c, tokens.accessToken, tokens.refreshToken);

    return c.json(
      successResponse({
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      }),
    );
  })
  .post("/refresh", async (c) => {
    const refreshToken = getCookie(c, refreshCookieName);

    if (!refreshToken) {
      return c.json(errorResponse("UNAUTHORIZED", "Missing refresh token"), 401);
    }

    try {
      const token = await verifyRefreshToken(refreshToken);
      const tokens = await signAdminTokens({
        adminId: token.adminId,
        email: token.email,
        name: token.name,
      });

      await revokeSession(token.sessionId);
      await revokeToken(refreshToken, getRefreshMaxAge());
      setAuthCookies(c, tokens.accessToken, tokens.refreshToken);

      return c.json(successResponse({ refreshed: true }));
    } catch {
      clearAuthCookies(c);
      return c.json(errorResponse("UNAUTHORIZED", "Invalid refresh token"), 401);
    }
  })
  .post("/logout", async (c) => {
    const accessToken = getCookie(c, accessCookieName);
    const refreshToken = getCookie(c, refreshCookieName);
    const ipAddress = getClientIp(c);
    const userAgent = getUserAgent(c);

    if (accessToken) {
      await revokeToken(accessToken, getAccessMaxAge());
    }

    if (refreshToken) {
      try {
        const token = await verifyRefreshToken(refreshToken);
        await revokeSession(token.sessionId);
        await writeAuditLog({
          actor: token.email,
          action: "logout",
          target: token.adminId,
          metadata: { sessionId: token.sessionId },
          ipAddress,
          userAgent,
        });
      } catch {
        await revokeToken(refreshToken, getRefreshMaxAge());
      }
    }

    clearAuthCookies(c);
    return c.json(successResponse({ loggedOut: true }));
  });
