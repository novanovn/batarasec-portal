import { and, count, desc, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/db";
import { portalAuditLog } from "@/db/schema";
import { adminAuth, type AdminContext } from "@/hono/middleware/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";

const listAuditSchema = z.object({
  action: z.string().trim().min(1).max(120).optional(),
  actor: z.string().trim().min(1).max(320).optional(),
  target: z.string().trim().min(1).max(160).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

type Env = {
  Variables: {
    admin: AdminContext;
  };
};

function serializeAuditLog(entry: typeof portalAuditLog.$inferSelect) {
  return {
    id: entry.id,
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    metadata: entry.metadata,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    createdAt: entry.createdAt.toISOString(),
  };
}

export const auditRoute = new Hono<Env>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const query = listAuditSchema.safeParse(c.req.query());

    if (!query.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid audit query"), 400);
    }

    const filters = [];

    if (query.data.action) {
      filters.push(eq(portalAuditLog.action, query.data.action));
    }

    if (query.data.actor) {
      filters.push(ilike(portalAuditLog.actor, `%${query.data.actor}%`));
    }

    if (query.data.target) {
      filters.push(ilike(portalAuditLog.target, `%${query.data.target}%`));
    }

    const where = filters.length ? and(...filters) : undefined;
    const offset = (query.data.page - 1) * query.data.pageSize;
    const totalQuery = db.select({ value: count() }).from(portalAuditLog);
    const rowsQuery = db
      .select()
      .from(portalAuditLog)
      .orderBy(desc(portalAuditLog.createdAt))
      .limit(query.data.pageSize)
      .offset(offset);

    const [totalRow] = where ? await totalQuery.where(where) : await totalQuery;
    const rows = where ? await rowsQuery.where(where) : await rowsQuery;

    return c.json(
      successResponse({
        auditLogs: rows.map(serializeAuditLog),
        pagination: {
          page: query.data.page,
          pageSize: query.data.pageSize,
          total: totalRow?.value ?? 0,
        },
      }),
    );
  });
