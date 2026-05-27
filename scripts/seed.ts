import "dotenv/config";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { portalAdmins } from "@/db/schema";
import { createId } from "@/lib/ids";

const adminEmail = "novan.hariman@batarasec.com";

async function main() {
  const existingAdmin = await db.query.portalAdmins.findFirst({
    where: eq(portalAdmins.email, adminEmail),
  });

  if (existingAdmin) {
    console.log(`Admin ${adminEmail} already exists. Password was not changed.`);
    return;
  }

  const password = randomBytes(18).toString("base64url");
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  await db.insert(portalAdmins).values({
    id: createId("adm"),
    email: adminEmail,
    name: "Novan Hariman",
    passwordHash,
  });

  console.log(`Created portal admin: ${adminEmail}`);
  console.log(`One-time password: ${password}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
