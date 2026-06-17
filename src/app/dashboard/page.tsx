import { AppShell } from "@/components/app-shell";
import { DashboardPage } from "@/components/dashboard-page";
import { getSessionContext } from "@/lib/auth";

export default async function DashboardRoute() {
  const { profile, settings } = await getSessionContext();

  return (
    <AppShell profile={profile} settings={settings}>
      <DashboardPage profile={profile} settings={settings} />
    </AppShell>
  );
}
