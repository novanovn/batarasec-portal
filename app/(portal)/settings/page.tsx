import { requireAdmin } from "@/lib/server-auth";
import { SettingsContent } from "@/components/settings-content";

export default async function SettingsPage() {
  await requireAdmin();
  return <SettingsContent />;
}
