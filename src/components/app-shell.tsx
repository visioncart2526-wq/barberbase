"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { roleLabels } from "@/lib/constants";
import type { Profile, ShopSettings, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ToastProvider, useToast } from "@/components/toast";

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "admin", "manager", "barber"] },
  { href: "/barbers", label: "Barbers", icon: Users, roles: ["owner", "admin", "manager"] },
  { href: "/services", label: "Services", icon: Scissors, roles: ["owner", "admin", "manager"] },
  { href: "/transactions", label: "Sales", icon: CalendarClock, roles: ["owner", "admin", "manager", "salesperson", "barber"] },
  { href: "/expenses", label: "Expenses", icon: WalletCards, roles: ["owner", "admin", "manager", "salesperson"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["owner", "admin", "manager", "salesperson"] },
  { href: "/performance", label: "Performance", icon: CircleDollarSign, roles: ["owner", "admin", "manager", "barber"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["owner", "admin"] },
];

function ShellContent({
  children,
  profile,
  settings,
}: {
  children: React.ReactNode;
  profile: Profile;
  settings: ShopSettings | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const links = navigation.filter((item) => item.roles.includes(profile.role));

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  const Sidebar = (
    <aside className="flex h-full w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-zinc-200 bg-white lg:w-72">
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 sm:px-5">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-white">
            <Scissors className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-zinc-950">
              {settings?.shop_name ?? "Nonoy Masing"}
            </span>
            <span className="block text-xs text-zinc-500">Operations</span>
          </span>
        </Link>
        <button
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-4">
        <div className="flex items-center gap-3 rounded-md bg-zinc-50 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 ring-1 ring-zinc-200">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950">
              {profile.full_name || "Signed-in user"}
            </p>
            <p className="text-xs text-zinc-500">{roleLabels[profile.role]}</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">{Sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-zinc-950/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      ) : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-3 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-950">
              {settings?.shop_name ?? "Nonoy Masing"}
            </p>
            <p className="hidden truncate text-xs text-zinc-500 sm:block">
              Live shop performance and operations
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>
        <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: {
  children: React.ReactNode;
  profile: Profile;
  settings: ShopSettings | null;
}) {
  return (
    <ToastProvider>
      <ShellContent {...props} />
    </ToastProvider>
  );
}
