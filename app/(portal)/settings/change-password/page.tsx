import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portalAdmins } from "@/db/schema";
import { ChangePasswordContent } from "@/components/change-password-content";
import { requireAdmin } from "@/lib/server-auth";

export default async function ChangePasswordPage() {
  const admin = await requireAdmin({ allowMustChangePassword: true });
  const row = await db.query.portalAdmins.findFirst({
    where: eq(portalAdmins.id, admin.adminId),
  });

  return <ChangePasswordContent forced={row?.mustChangePassword ?? false} />;
}
