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

function renderHtmlEmail(title: string, bodyHtml: string) {
  return `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background-color:#0f172a;color:#cbd5e1;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3)">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 24px;text-align:center;border-bottom:1px solid #1e293b">
        <h1 style="margin:0;color:#f8fafc;font-size:26px;font-weight:700;letter-spacing:-0.025em;background:linear-gradient(to right,#38bdf8,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline-block">BataraSec</h1>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">Enterprise License Services</p>
      </div>
      <!-- Body -->
      <div style="padding:32px 24px">
        <h2 style="margin:0 0 16px;color:#f8fafc;font-size:18px;font-weight:600;line-height:1.4">${title}</h2>
        <div style="font-size:14px;line-height:1.6;color:#cbd5e1">
          ${bodyHtml}
        </div>
      </div>
      <!-- Footer -->
      <div style="background-color:#020617;padding:24px;text-align:center;border-top:1px solid #1e293b;font-size:12px;color:#64748b">
        <p style="margin:0 0 8px">Ini adalah email otomatis dari platform lisensi BataraSec.</p>
        <p style="margin:0">&copy; ${new Date().getFullYear()} BataraSec. All rights reserved.</p>
      </div>
    </div>
  `;
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

function licenseEmailHtml(input: {
  customerName: string;
  tier: string;
  features: string[];
  maxUsers: number | null;
  expiresAt: Date | null;
  licenseKey: string;
}) {
  const featuresList = input.features.length
    ? input.features.map(f => `<span style="background-color:#0f172a;color:#e2e8f0;padding:4px 8px;border-radius:6px;font-size:12px;margin:2px;display:inline-block;border:1px solid #1e293b">${f}</span>`).join(" ")
    : "-";

  const expiresStr = input.expiresAt
    ? `${input.expiresAt.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} (UTC)`
    : "Selamanya (Perpetual)";

  const bodyHtml = `
    <p style="margin-top:0;color:#cbd5e1">Halo <strong>${input.customerName}</strong>,</p>
    <p style="color:#94a3b8">Lisensi platform BataraSec Enterprise Anda telah berhasil diterbitkan dan siap digunakan.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;background-color:#1e293b;border-radius:8px;overflow:hidden">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #0f172a;font-weight:600;color:#f8fafc;width:140px">Tier</td>
        <td style="padding:12px 16px;border-bottom:1px solid #0f172a;color:#cbd5e1;font-weight:600">${input.tier.toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #0f172a;font-weight:600;color:#f8fafc">Maks. Pengguna</td>
        <td style="padding:12px 16px;border-bottom:1px solid #0f172a;color:#cbd5e1">${input.maxUsers ?? "Tidak Terbatas"}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #0f172a;font-weight:600;color:#f8fafc">Kedaluwarsa</td>
        <td style="padding:12px 16px;border-bottom:1px solid #0f172a;color:#cbd5e1">${expiresStr}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-weight:600;color:#f8fafc">Fitur Aktif</td>
        <td style="padding:12px 16px;color:#cbd5e1;line-height:1.8">${featuresList}</td>
      </tr>
    </table>
    
    <p style="font-weight:600;color:#f8fafc;margin-bottom:8px">Lisensi Key Anda:</p>
    <div style="background-color:#020617;border:1px dashed #3b82f6;padding:16px;border-radius:8px;font-family:monospace;font-size:12px;color:#38bdf8;word-break:break-all;white-space:pre-wrap;line-height:1.5;margin-bottom:16px">${input.licenseKey}</div>
    <p style="font-size:12px;color:#ef4444;margin-top:0">* Simpan license key ini dengan aman dan jangan bagikan di channel publik.</p>
    
    <div style="text-align:center;margin:32px 0 16px">
      <a href="https://portal.batarasec.com/" style="background-color:#3b82f6;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 4px 6px -1px rgba(59,130,246,0.2)">Buka Portal BataraSec</a>
    </div>
  `;
  return renderHtmlEmail("Lisensi BataraSec Anda Siap", bodyHtml);
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

  const html = licenseEmailHtml({
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
      html,
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

export async function sendLicenseExpiryEmail(input: {
  customerEmail: string;
  customerName: string;
  tier: string;
  expiresAt: Date;
  warningType: "30d" | "7d" | "1d" | "0d";
}) {
  if (!smtpReady()) {
    throw new Error("SMTP configuration is incomplete");
  }

  let intervalLabel = "";
  if (input.warningType === "30d") intervalLabel = "30 hari";
  else if (input.warningType === "7d") intervalLabel = "7 hari";
  else if (input.warningType === "1d") intervalLabel = "1 hari";

  let subject = "";
  let text = "";
  let html = "";

  if (input.warningType === "0d") {
    subject = `[BataraSec] Peringatan: Lisensi Enterprise Anda Telah Kedaluwarsa`;
    text = [
      `Halo ${input.customerName},`,
      "",
      `Lisensi BataraSec Enterprise Anda telah kedaluwarsa hari ini.`,
      `Sistem sekarang memasuki masa tenggang (grace period) selama 1 bulan dengan fitur Enterprise tetap aktif namun dalam mode baca-saja (tidak bisa menambah/mengubah data).`,
      "",
      `Harap perbarui lisensi Anda segera untuk mengembalikan akses penuh.`,
      "",
      `Detail Lisensi:`,
      `Tier: ${input.tier}`,
      `Expires at: ${input.expiresAt.toISOString()}`,
    ].join("\n");

    const bodyHtml = `
      <p style="margin-top:0;color:#cbd5e1">Halo <strong>${input.customerName}</strong>,</p>
      <p style="color:#94a3b8">Lisensi BataraSec Enterprise Anda telah <strong>kedaluwarsa hari ini</strong>.</p>
      <div style="background-color:rgba(239,68,68,0.1);border-left:4px solid #ef4444;padding:16px;margin:24px 0;border-radius:0 8px 8px 0">
        <p style="margin:0;font-weight:600;color:#f87171;font-size:14px">Masa Tenggang Aktif (Grace Period)</p>
        <p style="margin:8px 0 0;color:#fca5a5;font-size:13px;line-height:1.5">
          Sistem Anda kini memasuki masa tenggang selama <strong>1 bulan</strong>. Fitur Enterprise tetap aktif namun berada dalam mode <strong>baca-saja (read-only)</strong> di mana Anda tidak dapat menambah atau mengubah data keamanan.
        </p>
      </div>
      <p style="color:#94a3b8">Harap lakukan pembaruan lisensi sesegera mungkin untuk mengembalikan akses penuh ke semua fitur modifikasi.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;background-color:#1e293b;border-radius:8px;overflow:hidden">
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #0f172a;font-weight:600;color:#f8fafc;width:120px">Tier</td>
          <td style="padding:12px 16px;border-bottom:1px solid #0f172a;color:#cbd5e1">${input.tier.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-weight:600;color:#f8fafc">Kedaluwarsa</td>
          <td style="padding:12px 16px;color:#cbd5e1">${input.expiresAt.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} (UTC)</td>
        </tr>
      </table>
      <div style="text-align:center;margin:32px 0 16px">
        <a href="https://portal.batarasec.com/" style="background-color:#3b82f6;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 4px 6px -1px rgba(59,130,246,0.2)">Perbarui Lisensi Sekarang</a>
      </div>
    `;
    html = renderHtmlEmail("Lisensi Telah Kedaluwarsa", bodyHtml);
  } else {
    subject = `[BataraSec] Peringatan: Lisensi Enterprise Anda Akan Berakhir Dalam ${intervalLabel}`;
    text = [
      `Halo ${input.customerName},`,
      "",
      `Lisensi BataraSec Enterprise Anda akan berakhir dalam ${intervalLabel}.`,
      `Harap perbarui lisensi Anda segera untuk prevent gangguan pada sistem Anda.`,
      "",
      `Detail Lisensi:`,
      `Tier: ${input.tier}`,
      `Expires at: ${input.expiresAt.toISOString()}`,
    ].join("\n");

    const bodyHtml = `
      <p style="margin-top:0;color:#cbd5e1">Halo <strong>${input.customerName}</strong>,</p>
      <p style="color:#94a3b8">Lisensi BataraSec Enterprise Anda akan berakhir dalam waktu <strong>${intervalLabel}</strong>.</p>
      <div style="background-color:rgba(245,158,11,0.1);border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:0 8px 8px 0">
        <p style="margin:0;font-weight:600;color:#fbbf24;font-size:14px">Perbarui Sebelum Berakhir</p>
        <p style="margin:8px 0 0;color:#fcd34d;font-size:13px;line-height:1.5">
          Harap perbarui lisensi Anda sebelum tanggal kedaluwarsa untuk memastikan kelancaran operasional fitur Enterprise tanpa beralih ke mode baca-saja.
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;background-color:#1e293b;border-radius:8px;overflow:hidden">
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #0f172a;font-weight:600;color:#f8fafc;width:120px">Tier</td>
          <td style="padding:12px 16px;border-bottom:1px solid #0f172a;color:#cbd5e1">${input.tier.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-weight:600;color:#f8fafc">Kedaluwarsa</td>
          <td style="padding:12px 16px;color:#cbd5e1">${input.expiresAt.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} (UTC)</td>
        </tr>
      </table>
      <div style="text-align:center;margin:32px 0 16px">
        <a href="https://portal.batarasec.com/" style="background-color:#3b82f6;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 4px 6px -1px rgba(59,130,246,0.2)">Perbarui Lisensi</a>
      </div>
    `;
    html = renderHtmlEmail("Peringatan Batas Waktu Lisensi", bodyHtml);
  }

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
      to: input.customerEmail,
      subject,
      text,
      html,
    });
  } else {
    console.log(`[DRY RUN] Expiry email sent to ${input.customerEmail}: ${subject}`);
  }
}
