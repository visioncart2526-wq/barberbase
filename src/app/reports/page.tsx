import { AppShell } from "@/components/app-shell";
import { ReportsPage } from "@/components/report-settings-pages";
import { requireRole } from "@/lib/auth";

export default async function ReportsRoute() {
  const { profile, settings } = await requireRole(["owner", "admin", "manager"]);

  return (
    <AppShell profile={profile} settings={settings}>
      <ReportsPage settings={settings} />
    </AppShell>
  );
}
