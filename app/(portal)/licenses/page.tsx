import { requireAdmin } from "@/lib/server-auth";
import { LicensesContent } from "@/components/licenses-content";

export default async function LicensesPage() {
  await requireAdmin();
  return <LicensesContent />;
}
