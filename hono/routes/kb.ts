import { createHash } from "node:crypto";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/db";
import { kbContributions, kbEntries } from "@/db/schema";
import { adminAuth, type AdminContext } from "@/hono/middleware/admin-auth";
import { licenseBearerAuth, type LicenseContext } from "@/hono/middleware/license-auth";
import { rateLimit } from "@/hono/middleware/rate-limit";
import { errorResponse, successResponse } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { createId } from "@/lib/ids";
import { getClientIp, getUserAgent } from "@/lib/request";
import { getValkeyClient } from "@/lib/valkey";

const cveIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^CVE-\d{4}-\d{4,}$/);

const lookupQuerySchema = z.object({
  cveId: cveIdSchema,
});

const severitySchema = z.enum(["critical", "high", "medium", "low", "info", "unknown"]);
const confidenceSchema = z.enum(["low", "medium", "high"]);
const prioritySchema = z.enum(["critical", "high", "medium", "low"]);

const contributionSchema = z.object({
  cveId: cveIdSchema,
  severity: severitySchema.default("unknown"),
  riskSummary: z.string().trim().min(1).max(2_000),
  businessImpact: z.string().trim().max(2_000).optional().nullable(),
  mitigationSteps: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  affectedPackages: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  priority: prioritySchema.optional().nullable(),
  modelUsed: z.string().trim().min(1).max(160).optional().nullable(),
  confidence: confidenceSchema.default("medium"),
});

const adminListKbSchema = z.object({
  q: z.string().trim().max(120).optional(),
  severity: severitySchema.optional(),
  curated: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const adminUpdateKbSchema = z.object({
  severity: severitySchema,
  riskSummary: z.string().trim().min(1).max(2_000),
  businessImpact: z.string().trim().max(2_000).optional().nullable(),
  mitigationSteps: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  affectedPackages: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  priority: prioritySchema.optional().nullable(),
  source: z.string().trim().min(1).max(120),
  modelUsed: z.string().trim().min(1).max(160).optional().nullable(),
  confidence: confidenceSchema,
  curatedByTeam: z.boolean(),
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

function serializeKbEntry(entry: typeof kbEntries.$inferSelect) {
  return {
    id: entry.id,
    cveId: entry.cveId,
    severity: entry.severity,
    riskSummary: entry.riskSummary,
    businessImpact: entry.businessImpact,
    mitigationSteps: entry.mitigationSteps,
    affectedPackages: entry.affectedPackages,
    priority: entry.priority,
    source: entry.source,
    modelUsed: entry.modelUsed,
    confidence: entry.confidence,
    version: entry.version,
    reportCount: entry.reportCount,
    curatedByTeam: entry.curatedByTeam,
    contributionCount: entry.contributionCount,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function sanitizeText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted-ip]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .trim() || null;
}

function sanitizeList(values: string[]): string[] {
  return values.map((value) => sanitizeText(value)).filter((value): value is string => Boolean(value));
}

function contributionHash(input: z.infer<typeof contributionSchema>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        cveId: input.cveId,
        riskSummary: sanitizeText(input.riskSummary),
        businessImpact: sanitizeText(input.businessImpact),
        mitigationSteps: sanitizeList(input.mitigationSteps),
        affectedPackages: sanitizeList(input.affectedPackages),
      }),
    )
    .digest("hex");
}

export const kbRoute = new Hono<Env>()
  .get("/admin/entries", adminAuth, async (c) => {
    const query = adminListKbSchema.safeParse(c.req.query());

    if (!query.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid KB admin query"), 400);
    }

    const filters = [];

    if (query.data.q) {
      const pattern = `%${query.data.q}%`;
      filters.push(or(ilike(kbEntries.cveId, pattern), ilike(kbEntries.riskSummary, pattern)));
    }

    if (query.data.severity) {
      filters.push(eq(kbEntries.severity, query.data.severity));
    }

    if (query.data.curated) {
      filters.push(eq(kbEntries.curatedByTeam, query.data.curated === "true"));
    }

    const where = filters.length ? sql`${sql.join(filters, sql` and `)}` : undefined;
    const offset = (query.data.page - 1) * query.data.pageSize;
    const totalQuery = db.select({ value: count() }).from(kbEntries);
    const rowsQuery = db
      .select()
      .from(kbEntries)
      .orderBy(desc(kbEntries.updatedAt), desc(kbEntries.createdAt))
      .limit(query.data.pageSize)
      .offset(offset);
    const [totalRow] = where ? await totalQuery.where(where) : await totalQuery;
    const entries = where ? await rowsQuery.where(where) : await rowsQuery;

    return c.json(
      successResponse({
        entries: entries.map(serializeKbEntry),
        pagination: {
          page: query.data.page,
          pageSize: query.data.pageSize,
          total: totalRow?.value ?? 0,
        },
      }),
    );
  })
  .get("/admin/entries/:id", adminAuth, async (c) => {
    const params = idParamSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid KB entry id"), 400);
    }

    const entry = await db.query.kbEntries.findFirst({
      where: eq(kbEntries.id, params.data.id),
    });

    if (!entry) {
      return c.json(errorResponse("NOT_FOUND", "KB entry not found"), 404);
    }

    return c.json(successResponse({ entry: serializeKbEntry(entry) }));
  })
  .patch("/admin/entries/:id", adminAuth, async (c) => {
    const params = idParamSchema.safeParse(c.req.param());
    const payload = adminUpdateKbSchema.safeParse(await c.req.json().catch(() => null));

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid KB entry id"), 400);
    }

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid KB entry payload"), 400);
    }

    const existing = await db.query.kbEntries.findFirst({
      where: eq(kbEntries.id, params.data.id),
    });

    if (!existing) {
      return c.json(errorResponse("NOT_FOUND", "KB entry not found"), 404);
    }

    const [entry] = await db
      .update(kbEntries)
      .set({
        severity: payload.data.severity,
        riskSummary: payload.data.riskSummary,
        businessImpact: sanitizeText(payload.data.businessImpact),
        mitigationSteps: sanitizeList(payload.data.mitigationSteps),
        affectedPackages: sanitizeList(payload.data.affectedPackages),
        priority: payload.data.priority ?? null,
        source: payload.data.source,
        modelUsed: sanitizeText(payload.data.modelUsed),
        confidence: payload.data.confidence,
        curatedByTeam: payload.data.curatedByTeam,
        version: sql`${kbEntries.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(kbEntries.id, existing.id))
      .returning();

    const admin = c.get("admin");
    await getValkeyClient().del(`kb:lookup:${entry.cveId}`, "kb:stats");
    await writeAuditLog({
      actor: admin.email,
      action: "kb_entry_update",
      target: entry.id,
      metadata: { cveId: entry.cveId, severity: entry.severity, curatedByTeam: entry.curatedByTeam },
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse({ entry: serializeKbEntry(entry) }));
  })
  .get("/stats", licenseBearerAuth, async (c) => {
    const valkey = getValkeyClient();
    const cacheKey = "kb:stats";
    const cached = await valkey.get(cacheKey);

    if (cached) {
      return c.json(successResponse(JSON.parse(cached) as {
        totalEntries: number;
        totalContributions: number;
        severityDistribution: Record<string, number>;
        recentEntries: ReturnType<typeof serializeKbEntry>[];
      }));
    }

    const [entryTotal] = await db.select({ value: count() }).from(kbEntries);
    const [contributionTotal] = await db.select({ value: count() }).from(kbContributions);
    const severityRows = await db
      .select({ severity: kbEntries.severity, value: count() })
      .from(kbEntries)
      .groupBy(kbEntries.severity);
    const recentEntries = await db
      .select()
      .from(kbEntries)
      .orderBy(desc(kbEntries.updatedAt), desc(kbEntries.createdAt))
      .limit(10);
    const response = {
      totalEntries: entryTotal?.value ?? 0,
      totalContributions: contributionTotal?.value ?? 0,
      severityDistribution: Object.fromEntries(
        severityRows.map((row) => [row.severity, row.value]),
      ),
      recentEntries: recentEntries.map(serializeKbEntry),
    };

    await valkey.set(cacheKey, JSON.stringify(response), "EX", 15 * 60);

    return c.json(successResponse(response));
  })
  .get(
    "/lookup",
    licenseBearerAuth,
    rateLimit({ keyPrefix: "kb:lookup", limit: 1000, windowSeconds: 24 * 60 * 60, by: "license" }),
    async (c) => {
    const query = lookupQuerySchema.safeParse(c.req.query());

    if (!query.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid CVE lookup query"), 400);
    }

    const valkey = getValkeyClient();
    const cacheKey = `kb:lookup:${query.data.cveId}`;
    const cached = await valkey.get(cacheKey);

    if (cached) {
      return c.json(successResponse(JSON.parse(cached) as { found: boolean; entry: ReturnType<typeof serializeKbEntry> | null }));
    }

    const entry = await db.query.kbEntries.findFirst({
      where: eq(kbEntries.cveId, query.data.cveId),
    });
    const response = entry
      ? { found: true, entry: serializeKbEntry(entry) }
      : { found: false, entry: null };

    await valkey.set(cacheKey, JSON.stringify(response), "EX", 60 * 60);

    return c.json(successResponse(response));
    },
  )
  .post(
    "/contribute",
    licenseBearerAuth,
    rateLimit({ keyPrefix: "kb:contribute", limit: 100, windowSeconds: 24 * 60 * 60, by: "license" }),
    async (c) => {
    const payload = contributionSchema.safeParse(await c.req.json().catch(() => null));

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid KB contribution payload"), 400);
    }

    const license = c.get("license");
    const hash = contributionHash(payload.data);
    const duplicate = await db.query.kbContributions.findFirst({
      where: eq(kbContributions.analysisHash, hash),
    });

    if (duplicate) {
      return c.json(successResponse({ accepted: false, duplicate: true, contributionId: duplicate.id }));
    }

    const sanitized = {
      cveId: payload.data.cveId,
      severity: payload.data.severity,
      riskSummary: sanitizeText(payload.data.riskSummary) ?? payload.data.cveId,
      businessImpact: sanitizeText(payload.data.businessImpact),
      mitigationSteps: sanitizeList(payload.data.mitigationSteps),
      affectedPackages: sanitizeList(payload.data.affectedPackages),
      priority: payload.data.priority ?? null,
      source: "customer_contribution",
      modelUsed: sanitizeText(payload.data.modelUsed),
      confidence: payload.data.confidence,
    };

    const existingEntry = await db.query.kbEntries.findFirst({
      where: eq(kbEntries.cveId, sanitized.cveId),
    });
    const now = new Date();
    const entry = existingEntry
      ? (
          await db
            .update(kbEntries)
            .set({
              reportCount: sql`${kbEntries.reportCount} + 1`,
              contributionCount: sql`${kbEntries.contributionCount} + 1`,
              updatedAt: now,
            })
            .where(eq(kbEntries.id, existingEntry.id))
            .returning()
        )[0]
      : (
          await db
            .insert(kbEntries)
            .values({
              id: createId("kb"),
              ...sanitized,
              reportCount: 1,
              contributionCount: 1,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0];

    const [contribution] = await db
      .insert(kbContributions)
      .values({
        id: createId("kbc"),
        kbEntryId: entry.id,
        licenseId: license.licenseId,
        cveId: sanitized.cveId,
        analysisHash: hash,
        accepted: true,
      })
      .returning();

    await getValkeyClient().del(`kb:lookup:${sanitized.cveId}`, "kb:stats");

    return c.json(
      successResponse({
        accepted: true,
        duplicate: false,
        contributionId: contribution.id,
        entry: serializeKbEntry(entry),
      }),
      201,
    );
    },
  );
