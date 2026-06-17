import { AppShell } from "@/components/app-shell";
import { PerformancePage } from "@/components/report-settings-pages";
import { getSessionContext } from "@/lib/auth";

export default async function PerformanceRoute() {
  const { profile, settings } = await getSessionContext();

  return (
    <AppShell profile={profile} settings={settings}>
      <PerformancePage profile={profile} settings={settings} />
    </AppShell>
  );
}
