import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ShopSettings, UserRole } from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/env";

export async function getSessionContext(): Promise<{
  userId: string;
  profile: Profile;
  settings: ShopSettings | null;
}> {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const { data: inserted } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: user.email ?? "Shop user",
        role: "barber",
      })
      .select("*")
      .single();
    profile = inserted;
  }

  if (!profile) {
    redirect("/login");
  }

  const { data: settings } = await supabase
    .from("shop_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  return { userId: user.id, profile, settings };
}

export async function requireRole(roles: UserRole[]) {
  const context = await getSessionContext();
  if (!roles.includes(context.profile.role)) {
    redirect("/dashboard");
  }
  return context;
}
