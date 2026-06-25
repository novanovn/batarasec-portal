import { requireAdmin } from "@/lib/server-auth";
import { CustomersContent } from "@/components/customers-content";

export default async function CustomersPage() {
  await requireAdmin();
  return <CustomersContent />;
}
