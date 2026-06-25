import { requireAdmin } from "@/lib/server-auth";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DashboardPage() {
  await requireAdmin();
  return <DashboardContent />;
}
