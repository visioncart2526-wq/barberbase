import { AppShell } from "@/components/app-shell";
import { SettingsPage } from "@/components/report-settings-pages";
import { requireRole } from "@/lib/auth";

export default async function SettingsRoute() {
  const { profile, settings } = await requireRole(["owner", "admin"]);

  return (
    <AppShell profile={profile} settings={settings}>
      <SettingsPage settings={settings} />
    </AppShell>
  );
}
