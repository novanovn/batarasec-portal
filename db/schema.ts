import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const portalAdmins = pgTable(
  "portal_admins",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("portal_admins_email_idx").on(table.email),
  }),
);

export const portalCustomers = pgTable(
  "portal_customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    phone: text("phone"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("portal_customers_email_idx").on(table.email),
    statusIdx: index("portal_customers_status_idx").on(table.status),
  }),
);

export const portalLicenses = pgTable(
  "portal_licenses",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => portalCustomers.id, { onDelete: "restrict" }),
    licenseKey: text("license_key").notNull(),
    tier: text("tier").notNull(),
    status: text("status").notNull().default("issued"),
    maxUsers: integer("max_users"),
    features: jsonb("features").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: text("revoked_by"),
    revokeReason: text("revoke_reason"),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    lastInstanceId: text("last_instance_id"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  },
  (table) => ({
    customerIdx: index("portal_licenses_customer_idx").on(table.customerId),
    licenseKeyIdx: uniqueIndex("portal_licenses_license_key_idx").on(table.licenseKey),
    statusIdx: index("portal_licenses_status_idx").on(table.status),
  }),
);

export const portalAuditLog = pgTable(
  "portal_audit_log",
  {
    id: text("id").primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actionIdx: index("portal_audit_log_action_idx").on(table.action),
    actorIdx: index("portal_audit_log_actor_idx").on(table.actor),
    createdAtIdx: index("portal_audit_log_created_at_idx").on(table.createdAt),
  }),
);

export const portalCustomersRelations = relations(portalCustomers, ({ many }) => ({
  licenses: many(portalLicenses),
}));

export const portalLicensesRelations = relations(portalLicenses, ({ one }) => ({
  customer: one(portalCustomers, {
    fields: [portalLicenses.customerId],
    references: [portalCustomers.id],
  }),
}));

