import { requireAdmin } from "@/lib/server-auth";
import { AuditContent } from "@/components/audit-content";

export default async function AuditPage() {
  await requireAdmin();
  return <AuditContent />;
}
