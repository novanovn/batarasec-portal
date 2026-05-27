import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { portalCustomers, portalLicenses } from "@/db/schema";
import { createId } from "@/lib/ids";
import { signLicenseToken } from "@/lib/license";
import { sendLicenseEmail } from "@/lib/license-email";

async function main() {
  process.env.SMTP_DRY_RUN = "true";

  const customerId = createId("cus");
  const licenseId = createId("lic");
  const now = Date.now();

  await db.insert(portalCustomers).values({
    id: customerId,
    name: "License Email Smoke Customer",
    email: `license-email-${now}@batarasec.test`,
    company: "Smoke Co",
    status: "active",
  });

  const licenseKey = await signLicenseToken({
    licenseId,
    customerId,
    tier: "demo",
    features: ["kb.lookup"],
    maxUsers: 3,
  });

  await db.insert(portalLicenses).values({
    id: licenseId,
    customerId,
    licenseKey,
    tier: "demo",
    status: "active",
    maxUsers: 3,
    features: ["kb.lookup"],
  });

  await sendLicenseEmail({
    licenseId,
    reason: "generated",
    requestedBy: "license-email-smoke",
  });

  const rows = await db
    .select({ emailSentAt: portalLicenses.emailSentAt })
    .from(portalLicenses)
    .where(eq(portalLicenses.id, licenseId))
    .limit(1);

  if (!rows[0]?.emailSentAt) {
    throw new Error("license email smoke expected emailSentAt to be set");
  }

  await db.update(portalCustomers).set({ status: "deleted" }).where(eq(portalCustomers.id, customerId));

  console.log("License email smoke validation passed");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
