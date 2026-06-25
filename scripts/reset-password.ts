import "dotenv/config";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { portalAdmins } from "@/db/schema";

const adminEmail = "novan.hariman@batarasec.com";

async function main() {
  const existing = await db.query.portalAdmins.findFirst({
    where: eq(portalAdmins.email, adminEmail),
  });

  if (!existing) {
    console.error(`Admin ${adminEmail} does not exist.`);
    process.exitCode = 1;
    return;
  }

  const password = randomBytes(18).toString("base64url");
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  await db.update(portalAdmins)
    .set({ passwordHash, mustChangePassword: true })
    .where(eq(portalAdmins.email, adminEmail));

  console.log(`=== Password Reset Successful ===`);
  console.log(`Email: ${adminEmail}`);
  console.log(`New Password: ${password}`);
  console.log(`*(You will be prompted to change this password on login)*`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
