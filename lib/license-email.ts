import { Queue, Worker, type ConnectionOptions, type JobsOptions } from "bullmq";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portalCustomers, portalLicenses } from "@/db/schema";

export type LicenseEmailJob = {
  licenseId: string;
  reason: "generated" | "resend";
  requestedBy: string;
};

const queueName = "license-email";
let queue: Queue<LicenseEmailJob, void> | null = null;

function bullMqConnection(): ConnectionOptions {
  const url = process.env.VALKEY_URL;

  if (!url) {
    throw new Error("VALKEY_URL is required");
  }

  return { url, maxRetriesPerRequest: null };
}

function smtpPassword() {
  return process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
}

function smtpDryRun() {
  return process.env.SMTP_DRY_RUN === "true";
}

function smtpReady() {
  if (smtpDryRun()) {
    return true;
  }

  const port = Number(process.env.SMTP_PORT);

  return Boolean(
    process.env.SMTP_HOST?.trim()
    && Number.isInteger(port)
    && port > 0
    && port <= 65_535
    && process.env.SMTP_USER?.trim()
    && process.env.SMTP_FROM?.trim()
    && smtpPassword(),
  );
}

function getLicenseEmailQueue(): Queue<LicenseEmailJob, void> {
  if (!queue) {
    queue = new Queue<LicenseEmailJob, void>(queueName, {
      connection: bullMqConnection(),
      defaultJobOptions: defaultLicenseEmailJobOptions(),
    });
  }

  return queue;
}

export function defaultLicenseEmailJobOptions(): JobsOptions {
  return {
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  };
}

export async function enqueueLicenseEmail(job: LicenseEmailJob) {
  const added = await getLicenseEmailQueue().add(job.reason, job, {
    jobId: `${job.reason}:${job.licenseId}:${Date.now()}`,
  });

  return { queued: true, jobId: added.id ?? null };
}

function licenseEmailText(input: {
  customerName: string;
  tier: string;
  features: string[];
  maxUsers: number | null;
  expiresAt: Date | null;
  licenseKey: string;
}) {
  return [
    `Halo ${input.customerName},`,
    "",
    "License BataraSec Anda sudah siap.",
    "",
    `Tier: ${input.tier}`,
    `Max users: ${input.maxUsers ?? "Unlimited"}`,
    `Expires at: ${input.expiresAt ? input.expiresAt.toISOString() : "Never"}`,
    `Features: ${input.features.length ? input.features.join(", ") : "-"}`,
    "",
    "License key:",
    input.licenseKey,
    "",
    "Simpan license key ini dengan aman dan jangan bagikan di channel publik.",
  ].join("\n");
}

export async function sendLicenseEmail(job: LicenseEmailJob) {
  if (!smtpReady()) {
    throw new Error("SMTP configuration is incomplete");
  }

  const rows = await db
    .select({ license: portalLicenses, customer: portalCustomers })
    .from(portalLicenses)
    .innerJoin(portalCustomers, eq(portalLicenses.customerId, portalCustomers.id))
    .where(eq(portalLicenses.id, job.licenseId))
    .limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error("License email target not found");
  }

  if (row.license.status !== "active" || row.customer.status !== "active") {
    throw new Error("License email target is inactive");
  }

  const text = licenseEmailText({
    customerName: row.customer.name,
    tier: row.license.tier,
    features: row.license.features,
    maxUsers: row.license.maxUsers,
    expiresAt: row.license.expiresAt,
    licenseKey: row.license.licenseKey,
  });

  if (!smtpDryRun()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPassword(),
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: row.customer.email,
      subject: `BataraSec license ${row.license.tier}`,
      text,
    });
  }

  await db
    .update(portalLicenses)
    .set({ emailSentAt: new Date() })
    .where(eq(portalLicenses.id, row.license.id));
}

export function createLicenseEmailWorker() {
  return new Worker<LicenseEmailJob, void>(queueName, async (job) => sendLicenseEmail(job.data), {
    connection: bullMqConnection(),
  });
}
