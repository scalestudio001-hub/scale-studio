import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Usuario + perfil de la sesión actual (una sola consulta por request). */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { supabase, user, profile: profile ?? null };
});

/** Exige sesión iniciada y cuenta aprobada. */
export async function requireActive() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect("/login");
  if (s.profile.role !== "admin" && s.profile.status !== "active") redirect("/pendiente");
  return { ...s, user: s.user, profile: s.profile };
}

/** Exige rol admin. */
export async function requireAdmin() {
  const s = await requireActive();
  if (s.profile.role !== "admin") redirect("/cursos");
  return s;
}
