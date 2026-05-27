import "dotenv/config";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { app } from "@/hono";
import { db, pool } from "@/db";
import { portalAdmins, portalCustomers } from "@/db/schema";
import { createId } from "@/lib/ids";

const adminEmail = `smoke-${Date.now()}@batarasec.test`;
const adminPassword = `Smoke-${Date.now()}-Password`;

function assertStatus(label: string, response: Response, expected: number | number[]) {
  const expectedValues = Array.isArray(expected) ? expected : [expected];

  if (!expectedValues.includes(response.status)) {
    throw new Error(`${label}: expected ${expectedValues.join("/")}, got ${response.status}`);
  }
}

function cookieHeader(response: Response) {
  const setCookie = response.headers.get("set-cookie");

  if (!setCookie) {
    throw new Error("login: missing set-cookie header");
  }

  return setCookie
    .split(/,(?=\s*[^;]+=)/)
    .map((cookie) => cookie.split(";")[0].trim())
    .join("; ");
}

async function json<T>(response: Response): Promise<T> {
  return await response.json() as T;
}

type ApiResponse<T> = {
  success: true;
  data: T;
};

async function main() {
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
  await db.insert(portalAdmins).values({
    id: createId("adm"),
    email: adminEmail,
    name: "Smoke Admin",
    passwordHash,
  });

  const unauthCustomers = await app.request("/api/customers");
  assertStatus("unauth customers", unauthCustomers, 401);

  const badLogin = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: "wrong" }),
  });
  assertStatus("bad login", badLogin, 401);

  const login = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assertStatus("login", login, 200);
  const cookie = cookieHeader(login);

  const customerEmail = `customer-${Date.now()}@batarasec.test`;
  const createCustomer = await app.request("/api/customers", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      name: "Smoke Customer",
      email: customerEmail,
      company: "Smoke Co",
      status: "active",
    }),
  });
  assertStatus("create customer", createCustomer, 201);
  const createCustomerPayload = await json<ApiResponse<{ customer: { id: string } }>>(createCustomer);
  const customerId = createCustomerPayload.data.customer.id;

  const listCustomers = await app.request("/api/customers?pageSize=5", { headers: { cookie } });
  assertStatus("list customers", listCustomers, 200);

  const generateLicense = await app.request("/api/licenses", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      customerId,
      tier: "demo",
      features: ["kb.lookup", "kb.contribute"],
      maxUsers: 5,
      expiresAt: null,
    }),
  });
  assertStatus("generate license", generateLicense, 201);
  const generateLicensePayload = await json<ApiResponse<{ license: { id: string; licenseKey: string } }>>(generateLicense);
  const licenseId = generateLicensePayload.data.license.id;
  const licenseKey = generateLicensePayload.data.license.licenseKey;

  const validateLicense = await app.request("/api/licenses/validate", {
    method: "POST",
    headers: { authorization: `Bearer ${licenseKey}`, "content-type": "application/json" },
    body: JSON.stringify({ instanceId: "smoke-instance" }),
  });
  assertStatus("validate license", validateLicense, 200);

  const contribute = await app.request("/api/kb/contribute", {
    method: "POST",
    headers: { authorization: `Bearer ${licenseKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      cveId: `CVE-2099-${Date.now().toString().slice(-4)}`,
      severity: "high",
      riskSummary: "Smoke validation risk summary",
      businessImpact: "Smoke validation business impact",
      mitigationSteps: ["Apply vendor patch"],
      affectedPackages: ["smoke-package"],
      priority: "high",
      confidence: "medium",
    }),
  });
  assertStatus("kb contribute", contribute, 201);
  const contributePayload = await json<ApiResponse<{ entry: { id: string; cveId: string } }>>(contribute);
  const kbEntryId = contributePayload.data.entry.id;
  const cveId = contributePayload.data.entry.cveId;

  const lookup = await app.request(`/api/kb/lookup?cveId=${cveId}`, {
    headers: { authorization: `Bearer ${licenseKey}` },
  });
  assertStatus("kb lookup", lookup, 200);

  const stats = await app.request("/api/kb/stats", {
    headers: { authorization: `Bearer ${licenseKey}` },
  });
  assertStatus("kb stats", stats, 200);

  const curate = await app.request(`/api/kb/admin/entries/${kbEntryId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      severity: "critical",
      riskSummary: "Smoke curated risk summary",
      businessImpact: "Smoke curated business impact",
      mitigationSteps: ["Patch immediately"],
      affectedPackages: ["smoke-package"],
      priority: "critical",
      source: "manual_curation",
      modelUsed: null,
      confidence: "high",
      curatedByTeam: true,
    }),
  });
  assertStatus("kb curate", curate, 200);

  const audit = await app.request("/api/audit?pageSize=5", { headers: { cookie } });
  assertStatus("audit list", audit, 200);

  const settings = await app.request("/api/settings", { headers: { cookie } });
  assertStatus("settings", settings, 200);

  const resend = await app.request(`/api/licenses/${licenseId}/resend-email`, {
    method: "POST",
    headers: { cookie },
  });
  assertStatus("resend license", resend, 202);

  const revoke = await app.request(`/api/licenses/${licenseId}/revoke`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ reason: "Smoke validation cleanup" }),
  });
  assertStatus("revoke license", revoke, 200);

  const revokedValidate = await app.request("/api/licenses/validate", {
    method: "POST",
    headers: { authorization: `Bearer ${licenseKey}`, "content-type": "application/json" },
    body: JSON.stringify({ instanceId: "smoke-instance-revoked" }),
  });
  assertStatus("validate revoked license", revokedValidate, 403);

  await db.update(portalCustomers).set({ status: "deleted" }).where(eq(portalCustomers.id, customerId));

  console.log("Phase 1 smoke validation passed");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
