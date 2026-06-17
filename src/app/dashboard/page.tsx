import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardPage } from "@/components/dashboard-page";
import { getSessionContext } from "@/lib/auth";

export default async function DashboardRoute() {
  const { profile, settings } = await getSessionContext();

  if (profile.role === "salesperson") {
    redirect("/transactions");
  }

  return (
    <AppShell profile={profile} settings={settings}>
      <DashboardPage profile={profile} settings={settings} />
    </AppShell>
  );
}
