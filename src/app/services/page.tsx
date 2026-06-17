import { AppShell } from "@/components/app-shell";
import { ServicesPage } from "@/components/management-pages";
import { requireRole } from "@/lib/auth";

export default async function ServicesRoute() {
  const { profile, settings } = await requireRole(["owner", "admin", "manager"]);

  return (
    <AppShell profile={profile} settings={settings}>
      <ServicesPage />
    </AppShell>
  );
}
