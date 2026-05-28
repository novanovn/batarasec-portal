import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/db";
import { portalAdmins } from "@/db/schema";
import { adminAuth, type AdminContext } from "@/hono/middleware/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp, getUserAgent } from "@/lib/request";

const secretKeys = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "LICENSE_SIGNING_SECRET",
  "SETTINGS_ENCRYPTION_KEY",
  "SMTP_PASSWORD",
  "SMTP_PASS",
];

const requiredSmtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_FROM"];

function configured(key: string) {
  return Boolean(process.env[key]?.trim());
}

function smtpPortValid() {
  const value = process.env.SMTP_PORT;

  if (!value) {
    return false;
  }

  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535;
}

function safeSettings() {
  const smtpMissing = requiredSmtpKeys.filter((key) => !configured(key));
  const secretStatus = Object.fromEntries(secretKeys.map((key) => [key, configured(key)]));

  return {
    portal: {
      nodeEnv: process.env.NODE_ENV ?? "development",
      portalUrl: process.env.PORTAL_URL ?? null,
      cookieSecure: process.env.COOKIE_SECURE === "true",
    },
    smtp: {
      host: process.env.SMTP_HOST ?? null,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
      user: process.env.SMTP_USER ?? null,
      from: process.env.SMTP_FROM ?? null,
      passwordConfigured: configured("SMTP_PASSWORD") || configured("SMTP_PASS"),
      configured: smtpMissing.length === 0 && smtpPortValid() && (configured("SMTP_PASSWORD") || configured("SMTP_PASS")),
      missing: smtpMissing,
      portValid: smtpPortValid(),
    },
    secrets: secretStatus,
  };
}

type Env = {
  Variables: {
    admin: AdminContext;
  };
};

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

export const settingsRoute = new Hono<Env>()
  .use("*", adminAuth)
  .get("/", (c) => {
    return c.json(successResponse({ settings: safeSettings() }));
  })
  .post("/change-password", async (c) => {
    const payload = changePasswordSchema.safeParse(await c.req.json().catch(() => null));

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "currentPassword and newPassword (min 12 chars) required"), 400);
    }

    const admin = c.get("admin");
    const row = await db.query.portalAdmins.findFirst({
      where: eq(portalAdmins.id, admin.adminId),
    });

    if (!row) {
      return c.json(errorResponse("NOT_FOUND", "Admin not found"), 404);
    }

    const valid = await argon2.verify(row.passwordHash, payload.data.currentPassword);

    if (!valid) {
      return c.json(errorResponse("FORBIDDEN", "Current password is incorrect"), 403);
    }

    const newHash = await argon2.hash(payload.data.newPassword, { type: argon2.argon2id });

    await db
      .update(portalAdmins)
      .set({ passwordHash: newHash, mustChangePassword: false })
      .where(eq(portalAdmins.id, admin.adminId));

    await writeAuditLog({
      actor: admin.email,
      action: "admin_password_changed",
      target: admin.adminId,
      metadata: {},
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse({ changed: true }));
  })
  .post("/smtp/test", (c) => {
    const settings = safeSettings();

    return c.json(
      successResponse({
        ready: settings.smtp.configured,
        checks: {
          hostConfigured: configured("SMTP_HOST"),
          portValid: settings.smtp.portValid,
          userConfigured: configured("SMTP_USER"),
          fromConfigured: configured("SMTP_FROM"),
          passwordConfigured: settings.smtp.passwordConfigured,
        },
      }),
    );
  });
