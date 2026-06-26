import { and, asc, count, desc, eq, lte, ne } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/db";
import { portalCustomers, portalLicenses } from "@/db/schema";
import { adminAuth, type AdminContext } from "@/hono/middleware/admin-auth";
import { licenseBearerAuth, type LicenseContext } from "@/hono/middleware/license-auth";
import { rateLimit } from "@/hono/middleware/rate-limit";
import { errorResponse, successResponse } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { createId } from "@/lib/ids";
import { enqueueLicenseEmail } from "@/lib/license-email";
import { maskLicenseKey, signLicenseToken, type LicenseTier } from "@/lib/license";
import { getClientIp, getUserAgent } from "@/lib/request";
import { getValkeyClient } from "@/lib/valkey";

const licenseTierSchema = z.enum(["pro", "pro_demo", "enterprise", "enterprise_demo"]);
const licenseStatusSchema = z.enum(["issued", "active", "revoked", "expired"]);

const listLicensesSchema = z.object({
  customerId: z.string().min(1).max(128).optional(),
  status: licenseStatusSchema.optional(),
  tier: licenseTierSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const generateLicenseSchema = z.object({
  customerId: z.string().min(1).max(128),
  tier: licenseTierSchema,
  features: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  maxUsers: z.number().int().positive().max(1_000_000).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const revokeLicenseSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional().nullable(),
});

const expiringSoonSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const validateLicenseSchema = z.object({
  instanceId: z.string().trim().min(1).max(160).optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1).max(128),
});

type Env = {
  Variables: {
    admin: AdminContext;
    license: LicenseContext;
  };
};

type LicenseRow = typeof portalLicenses.$inferSelect & {
  customer?: typeof portalCustomers.$inferSelect | null;
};

function serializeLicense(license: LicenseRow, includeKey = false) {
  return {
    id: license.id,
    customerId: license.customerId,
    customer: license.customer
      ? {
          id: license.customer.id,
          name: license.customer.name,
          email: license.customer.email,
          company: license.customer.company,
          status: license.customer.status,
        }
      : undefined,
    licenseKey: includeKey ? license.licenseKey : undefined,
    maskedLicenseKey: maskLicenseKey(license.licenseKey),
    tier: license.tier,
    status: license.status,
    maxUsers: license.maxUsers,
    features: license.features,
    issuedAt: license.issuedAt.toISOString(),
    expiresAt: license.expiresAt?.toISOString() ?? null,
    revokedAt: license.revokedAt?.toISOString() ?? null,
    revokedBy: license.revokedBy,
    revokeReason: license.revokeReason,
    lastValidatedAt: license.lastValidatedAt?.toISOString() ?? null,
    lastInstanceId: license.lastInstanceId,
    emailSentAt: license.emailSentAt?.toISOString() ?? null,
  };
}

function parseExpiresAt(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function validationResponse(license: LicenseContext) {
  return {
    valid: true,
    licenseId: license.licenseId,
    tier: license.tier,
    features: license.features,
    expiresAt: license.expiresAt?.toISOString() ?? null,
    maxUsers: license.maxUsers,
    customerName: license.customerName,
    customerCompany: license.customerCompany,
  };
}

export const licensesRoute = new Hono<Env>()
  .get("/auth-check", licenseBearerAuth, (c) => {
    const license = c.get("license");

    return c.json(
      successResponse({
        licenseId: license.licenseId,
        customerId: license.customerId,
        tier: license.tier,
        features: license.features,
        maxUsers: license.maxUsers,
        expiresAt: license.expiresAt?.toISOString() ?? null,
      }),
    );
  })
  .post(
    "/validate",
    licenseBearerAuth,
    rateLimit({ keyPrefix: "licenses:validate", limit: 100, windowSeconds: 60 * 60, by: "license" }),
    async (c) => {
    const payload = validateLicenseSchema.safeParse(await c.req.json().catch(() => ({})));

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid license validation payload"), 400);
    }

    const license = c.get("license");
    const cacheKey = `license:validation:${license.licenseId}:${payload.data.instanceId ?? "anonymous"}`;
    const valkey = getValkeyClient();
    const cached = await valkey.get(cacheKey);

    if (cached) {
      return c.json(successResponse(JSON.parse(cached) as ReturnType<typeof validationResponse>));
    }

    const response = validationResponse(license);

    const existing = await db.query.portalLicenses.findFirst({
      where: eq(portalLicenses.id, license.licenseId),
    });

    const isFirstActivation = existing?.status === "issued";

    await db
      .update(portalLicenses)
      .set({
        ...(isFirstActivation ? { status: "active" } : {}),
        lastValidatedAt: new Date(),
        lastInstanceId: payload.data.instanceId ?? null,
      })
      .where(eq(portalLicenses.id, license.licenseId));

    if (isFirstActivation) {
      await writeAuditLog({
        actor: license.customerId,
        action: "license_activated",
        target: license.licenseId,
        metadata: {
          customerId: license.customerId,
          tier: license.tier,
          instanceId: payload.data.instanceId ?? null,
        },
        ipAddress: getClientIp(c),
        userAgent: getUserAgent(c),
      });
    }

    await valkey.set(cacheKey, JSON.stringify(response), "EX", 60 * 60);

    return c.json(successResponse(response));
    },
  )
  .get("/", adminAuth, async (c) => {
    const query = listLicensesSchema.safeParse(c.req.query());

    if (!query.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid license query"), 400);
    }

    const filters = [];

    if (query.data.customerId) {
      filters.push(eq(portalLicenses.customerId, query.data.customerId));
    }

    if (query.data.status) {
      filters.push(eq(portalLicenses.status, query.data.status));
    }

    if (query.data.tier) {
      filters.push(eq(portalLicenses.tier, query.data.tier));
    }

    const where = filters.length ? and(...filters) : undefined;
    const offset = (query.data.page - 1) * query.data.pageSize;
    const totalQuery = db.select({ value: count() }).from(portalLicenses);
    const rowsQuery = db
      .select({ license: portalLicenses, customer: portalCustomers })
      .from(portalLicenses)
      .innerJoin(portalCustomers, eq(portalLicenses.customerId, portalCustomers.id))
      .orderBy(desc(portalLicenses.issuedAt), asc(portalLicenses.id))
      .limit(query.data.pageSize)
      .offset(offset);

    const [totalRow] = where ? await totalQuery.where(where) : await totalQuery;
    const rows = where ? await rowsQuery.where(where) : await rowsQuery;

    return c.json(
      successResponse({
        licenses: rows.map((row) => serializeLicense({ ...row.license, customer: row.customer }, true /* includeKey — admin portal */)),
        pagination: {
          page: query.data.page,
          pageSize: query.data.pageSize,
          total: totalRow?.value ?? 0,
        },
      }),
    );
  })
  .post("/", adminAuth, async (c) => {
    const payload = generateLicenseSchema.safeParse(await c.req.json().catch(() => null));

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid license payload"), 400);
    }

    const customer = await db.query.portalCustomers.findFirst({
      where: eq(portalCustomers.id, payload.data.customerId),
    });

    if (!customer || customer.status === "deleted") {
      return c.json(errorResponse("NOT_FOUND", "Customer not found"), 404);
    }

    if (customer.status !== "active") {
      return c.json(errorResponse("FORBIDDEN", "Customer is not active"), 403);
    }

    const admin = c.get("admin");
    const licenseId = createId("lic");
    const expiresAt = parseExpiresAt(payload.data.expiresAt);
    const licenseKey = await signLicenseToken(
      {
        licenseId,
        customerId: customer.id,
        tier: payload.data.tier as LicenseTier,
        features: payload.data.features,
        maxUsers: payload.data.maxUsers ?? null,
      },
      expiresAt,
    );
    const license = {
      id: licenseId,
      customerId: customer.id,
      licenseKey,
      tier: payload.data.tier,
      status: "issued",
      maxUsers: payload.data.maxUsers ?? null,
      features: payload.data.features,
      expiresAt,
    };

    const [created] = await db.insert(portalLicenses).values(license).returning();
    const emailJob = await enqueueLicenseEmail({
      licenseId: created.id,
      reason: "generated",
      requestedBy: admin.email,
    });

    await writeAuditLog({
      actor: admin.email,
      action: "license_generate",
      target: created.id,
      metadata: {
        customerId: customer.id,
        tier: created.tier,
        expiresAt: created.expiresAt?.toISOString() ?? null,
        emailQueued: emailJob.queued,
        emailJobId: emailJob.jobId,
      },
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse({ license: serializeLicense({ ...created, customer }, true), email: emailJob }), 201);
  })
  .get("/expiring-soon", adminAuth, async (c) => {
    const query = expiringSoonSchema.safeParse(c.req.query());

    if (!query.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid expiring soon query"), 400);
    }

    const until = new Date(Date.now() + query.data.days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ license: portalLicenses, customer: portalCustomers })
      .from(portalLicenses)
      .innerJoin(portalCustomers, eq(portalLicenses.customerId, portalCustomers.id))
      .where(
        and(
          eq(portalLicenses.status, "active"),
          lte(portalLicenses.expiresAt, until),
          ne(portalCustomers.status, "deleted"),
        ),
      )
      .orderBy(asc(portalLicenses.expiresAt), asc(portalLicenses.id));

    return c.json(
      successResponse({
        licenses: rows.map((row) => serializeLicense({ ...row.license, customer: row.customer })),
      }),
    );
  })
  .get("/:id", adminAuth, async (c) => {
    const params = idParamSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid license id"), 400);
    }

    const rows = await db
      .select({ license: portalLicenses, customer: portalCustomers })
      .from(portalLicenses)
      .innerJoin(portalCustomers, eq(portalLicenses.customerId, portalCustomers.id))
      .where(eq(portalLicenses.id, params.data.id))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return c.json(errorResponse("NOT_FOUND", "License not found"), 404);
    }

    return c.json(successResponse({ license: serializeLicense({ ...row.license, customer: row.customer }) }));
  })
  .post("/:id/revoke", adminAuth, async (c) => {
    const params = idParamSchema.safeParse(c.req.param());
    const payload = revokeLicenseSchema.safeParse(await c.req.json().catch(() => ({})));

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid license id"), 400);
    }

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid revoke payload"), 400);
    }

    const existing = await db.query.portalLicenses.findFirst({
      where: eq(portalLicenses.id, params.data.id),
    });

    if (!existing) {
      return c.json(errorResponse("NOT_FOUND", "License not found"), 404);
    }

    if (existing.status === "revoked") {
      return c.json(errorResponse("CONFLICT", "License is already revoked"), 409);
    }

    const admin = c.get("admin");
    const [license] = await db
      .update(portalLicenses)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revokedBy: admin.email,
        revokeReason: payload.data.reason?.trim() || null,
      })
      .where(eq(portalLicenses.id, existing.id))
      .returning();

    await writeAuditLog({
      actor: admin.email,
      action: "license_revoke",
      target: license.id,
      metadata: { customerId: license.customerId, reason: license.revokeReason },
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse({ license: serializeLicense(license) }));
  })
  .post("/:id/resend-email", adminAuth, async (c) => {
    const params = idParamSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid license id"), 400);
    }

    const license = await db.query.portalLicenses.findFirst({
      where: eq(portalLicenses.id, params.data.id),
    });

    if (!license) {
      return c.json(errorResponse("NOT_FOUND", "License not found"), 404);
    }

    const admin = c.get("admin");
    const emailJob = await enqueueLicenseEmail({
      licenseId: license.id,
      reason: "resend",
      requestedBy: admin.email,
    });

    await writeAuditLog({
      actor: admin.email,
      action: "license_resend_email",
      target: license.id,
      metadata: { customerId: license.customerId, emailQueued: emailJob.queued, emailJobId: emailJob.jobId },
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse(emailJob), 202);
  });
