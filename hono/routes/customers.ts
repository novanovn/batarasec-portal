import { and, asc, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/db";
import { portalCustomers, portalLicenses } from "@/db/schema";
import { adminAuth, type AdminContext } from "@/hono/middleware/admin-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { createId } from "@/lib/ids";
import { getClientIp, getUserAgent } from "@/lib/request";

const customerStatusSchema = z.enum(["active", "suspended", "deleted"]);

const listCustomersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: customerStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  company: z.string().trim().min(1).max(160).optional().nullable(),
  phone: z.string().trim().min(1).max(40).optional().nullable(),
  notes: z.string().trim().max(2_000).optional().nullable(),
  status: z.enum(["active", "suspended"]).default("active"),
});

const updateCustomerSchema = createCustomerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

const idParamSchema = z.object({
  id: z.string().min(1).max(128),
});

type Env = {
  Variables: {
    admin: AdminContext;
  };
};

function serializeCustomer(customer: typeof portalCustomers.$inferSelect) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    company: customer.company,
    phone: customer.phone,
    notes: customer.notes,
    status: customer.status,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function serializeLicense(license: typeof portalLicenses.$inferSelect) {
  return {
    id: license.id,
    tier: license.tier,
    status: license.status,
    maxUsers: license.maxUsers,
    features: license.features,
    issuedAt: license.issuedAt.toISOString(),
    expiresAt: license.expiresAt?.toISOString() ?? null,
    revokedAt: license.revokedAt?.toISOString() ?? null,
    lastValidatedAt: license.lastValidatedAt?.toISOString() ?? null,
    lastInstanceId: license.lastInstanceId,
    emailSentAt: license.emailSentAt?.toISOString() ?? null,
  };
}

function cleanOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export const customersRoute = new Hono<Env>()
  .use("*", adminAuth)
  .get("/", async (c) => {
    const query = listCustomersSchema.safeParse(c.req.query());

    if (!query.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid customer query"), 400);
    }

    const filters = [];

    if (query.data.status) {
      filters.push(eq(portalCustomers.status, query.data.status));
    } else {
      filters.push(ne(portalCustomers.status, "deleted"));
    }

    if (query.data.q) {
      const pattern = `%${query.data.q}%`;
      filters.push(
        or(
          ilike(portalCustomers.name, pattern),
          ilike(portalCustomers.email, pattern),
          ilike(portalCustomers.company, pattern),
        ),
      );
    }

    const where = and(...filters);
    const offset = (query.data.page - 1) * query.data.pageSize;
    const [totalRow] = await db.select({ value: count() }).from(portalCustomers).where(where);
    const customers = await db
      .select()
      .from(portalCustomers)
      .where(where)
      .orderBy(desc(portalCustomers.createdAt))
      .limit(query.data.pageSize)
      .offset(offset);

    return c.json(
      successResponse({
        customers: customers.map(serializeCustomer),
        pagination: {
          page: query.data.page,
          pageSize: query.data.pageSize,
          total: totalRow?.value ?? 0,
        },
      }),
    );
  })
  .post("/", async (c) => {
    const payload = createCustomerSchema.safeParse(await c.req.json().catch(() => null));

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid customer payload"), 400);
    }

    const duplicate = await db.query.portalCustomers.findFirst({
      where: eq(portalCustomers.email, payload.data.email),
    });

    if (duplicate) {
      return c.json(errorResponse("CONFLICT", "Customer email already exists"), 409);
    }

    const admin = c.get("admin");
    const now = new Date();
    const customer = {
      id: createId("cus"),
      name: payload.data.name,
      email: payload.data.email,
      company: cleanOptionalText(payload.data.company),
      phone: cleanOptionalText(payload.data.phone),
      notes: cleanOptionalText(payload.data.notes),
      status: payload.data.status,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(portalCustomers).values(customer);
    await writeAuditLog({
      actor: admin.email,
      action: "customer_create",
      target: customer.id,
      metadata: { email: customer.email, status: customer.status },
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse({ customer: serializeCustomer(customer) }), 201);
  })
  .get("/:id", async (c) => {
    const params = idParamSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid customer id"), 400);
    }

    const customer = await db.query.portalCustomers.findFirst({
      where: eq(portalCustomers.id, params.data.id),
    });

    if (!customer || customer.status === "deleted") {
      return c.json(errorResponse("NOT_FOUND", "Customer not found"), 404);
    }

    const licenses = await db
      .select()
      .from(portalLicenses)
      .where(eq(portalLicenses.customerId, customer.id))
      .orderBy(desc(portalLicenses.issuedAt), asc(portalLicenses.id));

    return c.json(
      successResponse({
        customer: serializeCustomer(customer),
        licenses: licenses.map(serializeLicense),
      }),
    );
  })
  .patch("/:id", async (c) => {
    const params = idParamSchema.safeParse(c.req.param());
    const payload = updateCustomerSchema.safeParse(await c.req.json().catch(() => null));

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid customer id"), 400);
    }

    if (!payload.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid customer payload"), 400);
    }

    const existing = await db.query.portalCustomers.findFirst({
      where: eq(portalCustomers.id, params.data.id),
    });

    if (!existing || existing.status === "deleted") {
      return c.json(errorResponse("NOT_FOUND", "Customer not found"), 404);
    }

    if (payload.data.email && payload.data.email !== existing.email) {
      const duplicate = await db.query.portalCustomers.findFirst({
        where: eq(portalCustomers.email, payload.data.email),
      });

      if (duplicate) {
        return c.json(errorResponse("CONFLICT", "Customer email already exists"), 409);
      }
    }

    const updateData = {
      ...payload.data,
      company: payload.data.company === undefined ? undefined : cleanOptionalText(payload.data.company),
      phone: payload.data.phone === undefined ? undefined : cleanOptionalText(payload.data.phone),
      notes: payload.data.notes === undefined ? undefined : cleanOptionalText(payload.data.notes),
      updatedAt: new Date(),
    };

    const [customer] = await db
      .update(portalCustomers)
      .set(updateData)
      .where(eq(portalCustomers.id, existing.id))
      .returning();

    const admin = c.get("admin");
    await writeAuditLog({
      actor: admin.email,
      action: "customer_update",
      target: existing.id,
      metadata: { fields: Object.keys(payload.data) },
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse({ customer: serializeCustomer(customer) }));
  })
  .delete("/:id", async (c) => {
    const params = idParamSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json(errorResponse("BAD_REQUEST", "Invalid customer id"), 400);
    }

    const existing = await db.query.portalCustomers.findFirst({
      where: eq(portalCustomers.id, params.data.id),
    });

    if (!existing || existing.status === "deleted") {
      return c.json(errorResponse("NOT_FOUND", "Customer not found"), 404);
    }

    const [customer] = await db
      .update(portalCustomers)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(portalCustomers.id, existing.id))
      .returning();

    const admin = c.get("admin");
    await writeAuditLog({
      actor: admin.email,
      action: "customer_delete",
      target: existing.id,
      metadata: { email: existing.email },
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    return c.json(successResponse({ customer: serializeCustomer(customer) }));
  });
