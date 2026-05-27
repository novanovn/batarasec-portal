import "dotenv/config";
import argon2 from "argon2";
import { app } from "@/hono";
import { db, pool } from "@/db";
import { portalAdmins } from "@/db/schema";
import { createId } from "@/lib/ids";

const adminEmail = `rate-${Date.now()}@batarasec.test`;
const adminPassword = `Rate-${Date.now()}-Password`;

async function main() {
  await db.insert(portalAdmins).values({
    id: createId("adm"),
    email: adminEmail,
    name: "Rate Smoke Admin",
    passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
  });

  const statuses: number[] = [];
  const ipAddress = `198.51.100.${Date.now().toString().slice(-3)}`;

  for (let index = 0; index < 6; index += 1) {
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ipAddress,
      },
      body: JSON.stringify({ email: adminEmail, password: "wrong" }),
    });

    statuses.push(response.status);
  }

  const expected = "401,401,401,401,401,429";
  const actual = statuses.join(",");

  if (actual !== expected) {
    throw new Error(`login rate limit expected ${expected}, got ${actual}`);
  }

  console.log("Rate limit smoke validation passed");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
