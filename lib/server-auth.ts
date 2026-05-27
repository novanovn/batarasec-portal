import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

export async function requireAdmin(): Promise<VerifiedAdminToken> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/login");
  }

  return admin;
}
