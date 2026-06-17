import { AppShell } from "@/components/app-shell";
import { ExpensesPage } from "@/components/management-pages";
import { requireRole } from "@/lib/auth";

export default async function ExpensesRoute() {
  const { profile, settings } = await requireRole(["owner", "admin", "manager"]);

  return (
    <AppShell profile={profile} settings={settings}>
      <ExpensesPage settings={settings} />
    </AppShell>
  );
}
