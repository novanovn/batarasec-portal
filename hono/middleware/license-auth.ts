import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "@/db";
import { portalCustomers, portalLicenses } from "@/db/schema";
import { errorResponse } from "@/lib/api-response";
import { verifyLicenseToken, type LicenseTier } from "@/lib/license";

export type LicenseContext = {
  licenseId: string;
  customerId: string;
  tier: LicenseTier;
  features: string[];
  maxUsers: number | null;
  expiresAt: Date | null;
};

type Env = {
  Variables: {
    license: LicenseContext;
  };
};

export const licenseBearerAuth = createMiddleware<Env>(async (c, next) => {
  const authorization = c.req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return c.json(errorResponse("UNAUTHORIZED", "Missing license bearer token"), 401);
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return c.json(errorResponse("UNAUTHORIZED", "Missing license bearer token"), 401);
  }

  let claims;

  try {
    claims = await verifyLicenseToken(token);
  } catch {
    return c.json(errorResponse("UNAUTHORIZED", "Invalid license bearer token"), 401);
  }

  const rows = await db
    .select({
      licenseId: portalLicenses.id,
      licenseKey: portalLicenses.licenseKey,
      licenseStatus: portalLicenses.status,
      tier: portalLicenses.tier,
      features: portalLicenses.features,
      maxUsers: portalLicenses.maxUsers,
      expiresAt: portalLicenses.expiresAt,
      customerId: portalCustomers.id,
      customerStatus: portalCustomers.status,
    })
    .from(portalLicenses)
    .innerJoin(portalCustomers, eq(portalLicenses.customerId, portalCustomers.id))
    .where(
      and(
        eq(portalLicenses.id, claims.licenseId),
        eq(portalLicenses.customerId, claims.customerId),
      ),
    )
    .limit(1);

  const row = rows[0];

  if (!row || row.licenseKey !== token) {
    return c.json(errorResponse("UNAUTHORIZED", "Invalid license bearer token"), 401);
  }

  if (row.licenseStatus === "revoked") {
    return c.json(errorResponse("FORBIDDEN", "License has been revoked"), 403);
  }

  if (row.licenseStatus !== "issued" && row.licenseStatus !== "active") {
    return c.json(errorResponse("FORBIDDEN", "License is not active"), 403);
  }

  if (row.customerStatus !== "active") {
    return c.json(errorResponse("FORBIDDEN", "Customer is not active"), 403);
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return c.json(errorResponse("FORBIDDEN", "License is expired"), 403);
  }

  c.set("license", {
    licenseId: row.licenseId,
    customerId: row.customerId,
    tier: row.tier as LicenseTier,
    features: row.features,
    maxUsers: row.maxUsers,
    expiresAt: row.expiresAt,
  });

  await next();
});
