import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portalAuditLog, portalCustomers, portalLicenses } from "@/db/schema";
import { LicenseDetailContent } from "@/components/license-detail-content";
import { requireAdmin } from "@/lib/server-auth";
import { desc } from "drizzle-orm";

export default async function LicenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const rows = await db
    .select({ license: portalLicenses, customer: portalCustomers })
    .from(portalLicenses)
    .innerJoin(portalCustomers, eq(portalLicenses.customerId, portalCustomers.id))
    .where(eq(portalLicenses.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    notFound();
  }

  const auditEntries = await db
    .select()
    .from(portalAuditLog)
    .where(eq(portalAuditLog.target, id))
    .orderBy(desc(portalAuditLog.createdAt))
    .limit(20);

  return <LicenseDetailContent license={row.license} customer={row.customer} auditEntries={auditEntries} />;
}
