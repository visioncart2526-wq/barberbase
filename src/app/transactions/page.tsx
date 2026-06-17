import { AppShell } from "@/components/app-shell";
import { TransactionsPage } from "@/components/management-pages";
import { requireRole } from "@/lib/auth";

export default async function TransactionsRoute() {
  const { profile, settings } = await requireRole(["owner", "admin", "manager", "salesperson", "barber"]);

  return (
    <AppShell profile={profile} settings={settings}>
      <TransactionsPage profile={profile} settings={settings} />
    </AppShell>
  );
}
