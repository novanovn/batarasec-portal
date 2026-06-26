import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { portalAuditLog, portalCustomers, portalLicenses } from "@/db/schema";
import { writeAuditLog } from "./audit";
import { sendLicenseExpiryEmail } from "./license-email";

export async function checkPortalLicenseExpirations() {
  console.log("[ExpiryScheduler] Checking portal licenses for warnings/expirations...");
  
  try {
    // Select active or issued licenses
    const licenses = await db
      .select({
        license: portalLicenses,
        customer: portalCustomers,
      })
      .from(portalLicenses)
      .innerJoin(portalCustomers, eq(portalLicenses.customerId, portalCustomers.id))
      .where(
        and(
          eq(portalCustomers.status, "active"),
          sql`${portalLicenses.status} IN ('active', 'issued')`
        )
      );

    const now = Date.now();

    for (const row of licenses) {
      const expiresAt = row.license.expiresAt;
      if (!expiresAt) continue;

      const expiresTime = expiresAt.getTime();
      const diffMs = expiresTime - now;
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

      let warningType: "30d" | "7d" | "1d" | "0d" | null = null;

      if (diffDays <= 0) {
        warningType = "0d";
      } else if (diffDays <= 1) {
        warningType = "1d";
      } else if (diffDays <= 7 && diffDays > 3) {
        warningType = "7d";
      } else if (diffDays <= 30 && diffDays > 25) {
        warningType = "30d";
      }

      if (!warningType) continue;

      // Check if audit log already has this notification to prevent duplicates
      const logs = await db
        .select({ id: portalAuditLog.id })
        .from(portalAuditLog)
        .where(
          and(
            eq(portalAuditLog.action, "license_expiry_email"),
            eq(portalAuditLog.target, row.license.id),
            sql`${portalAuditLog.metadata}->>'type' = ${warningType}`
          )
        )
        .limit(1);

      if (logs.length > 0) {
        continue; // Already sent
      }

      try {
        await sendLicenseExpiryEmail({
          customerEmail: row.customer.email,
          customerName: row.customer.name,
          tier: row.license.tier,
          expiresAt,
          warningType,
        });

        // Write audit log
        await writeAuditLog({
          actor: "system",
          action: "license_expiry_email",
          target: row.license.id,
          metadata: { type: warningType },
        });

        console.log(`[ExpiryScheduler] Successfully sent ${warningType} expiry warning email for license ${row.license.id} to ${row.customer.email}`);

        // If fully expired, update status to expired
        if (warningType === "0d") {
          await db
            .update(portalLicenses)
            .set({ status: "expired" })
            .where(eq(portalLicenses.id, row.license.id));
        }
      } catch (err) {
        console.error(`[ExpiryScheduler] Failed to send expiry email for license ${row.license.id}:`, err);
      }
    }
  } catch (error) {
    console.error("[ExpiryScheduler] Error checking license expirations:", error);
  }
}

export function runPortalExpirySchedulerWorker() {
  const checkHour = 8; // Run daily at 8 AM UTC
  const checkMinute = 0;

  const scheduleNext = () => {
    const now = new Date();
    const nextRun = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        checkHour,
        checkMinute,
        0
      )
    );

    // If candidate time has already passed today, set to tomorrow
    if (nextRun <= now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    const delay = Math.max(1_000, nextRun.getTime() - Date.now());
    console.log(`[ExpiryScheduler] Next portal license expiry check scheduled at ${nextRun.toISOString()} (UTC)`);

    setTimeout(() => {
      checkPortalLicenseExpirations()
        .catch((err) => console.error("[ExpiryScheduler] Expiry check failed:", err))
        .finally(scheduleNext);
    }, delay);
  };

  // Run on startup, then schedule next
  checkPortalLicenseExpirations()
    .catch((err) => console.error("[ExpiryScheduler] Initial startup check failed:", err))
    .finally(scheduleNext);
}
