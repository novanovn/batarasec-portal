import "dotenv/config";
import argon2 from "argon2";
import { db, pool } from "@/db";
import { portalAdmins } from "@/db/schema";
import { createId } from "@/lib/ids";

const baseUrl = process.env.PORTAL_SMOKE_URL || "http://localhost:8080";
const adminEmail = `ui-${Date.now()}@batarasec.test`;
const adminPassword = `Ui-${Date.now()}-Password`;
const pages = ["/", "/customers", "/licenses", "/audit", "/settings"];

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

async function main() {
  await db.insert(portalAdmins).values({
    id: createId("adm"),
    email: adminEmail,
    name: "UI Smoke Admin",
    passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
  });

  const unauth = await fetch(`${baseUrl}/customers`, { redirect: "manual" });
  assertStatus("unauth customers redirect", unauth, [302, 307, 308]);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assertStatus("login", login, 200);
  const cookie = cookieHeader(login);

  for (const page of pages) {
    const response = await fetch(`${baseUrl}${page}`, {
      headers: { cookie },
      redirect: "manual",
    });
    assertStatus(`page ${page}`, response, 200);

    const html = await response.text();

    if (!html.includes("BataraSec Portal")) {
      throw new Error(`page ${page}: missing portal shell marker`);
    }
  }

  console.log("UI route smoke validation passed");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
