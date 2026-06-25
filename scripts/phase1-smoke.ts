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
      tier: "pro_demo",
      features: [],
      maxUsers: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
