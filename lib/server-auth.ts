import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portalAdmins } from "@/db/schema";
import { accessCookieName, verifyAccessToken, type VerifiedAdminToken } from "@/lib/auth";

export async function getCurrentAdmin(): Promise<VerifiedAdminToken | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(accessCookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireAdmin(opts?: { allowMustChangePassword?: boolean }): Promise<VerifiedAdminToken> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/login");
  }

  if (!opts?.allowMustChangePassword) {
    const row = await db.query.portalAdmins.findFirst({
      where: eq(portalAdmins.id, admin.adminId),
    });

    if (row?.mustChangePassword) {
      redirect("/settings/change-password");
    }
  }

  return admin;
}
