import { Hono } from "hono";
import { adminAuth, type AdminContext } from "@/hono/middleware/admin-auth";
import { successResponse } from "@/lib/api-response";

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

export const settingsRoute = new Hono<Env>()
  .use("*", adminAuth)
  .get("/", (c) => {
    return c.json(successResponse({ settings: safeSettings() }));
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
