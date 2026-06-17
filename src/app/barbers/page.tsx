import { AppShell } from "@/components/app-shell";
import { BarbersPage } from "@/components/management-pages";
import { requireRole } from "@/lib/auth";

export default async function BarbersRoute() {
  const { profile, settings } = await requireRole(["owner", "admin", "manager"]);

  return (
    <AppShell profile={profile} settings={settings}>
      <BarbersPage />
    </AppShell>
  );
}
