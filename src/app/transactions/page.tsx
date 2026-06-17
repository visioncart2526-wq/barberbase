import { AppShell } from "@/components/app-shell";
import { TransactionsPage } from "@/components/management-pages";
import { getSessionContext } from "@/lib/auth";

export default async function TransactionsRoute() {
  const { profile, settings } = await getSessionContext();

  return (
    <AppShell profile={profile} settings={settings}>
      <TransactionsPage profile={profile} settings={settings} />
    </AppShell>
  );
}
