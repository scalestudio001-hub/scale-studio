import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { Avatar, PageHeader } from "@/components/ui";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Miembros" };

export default async function MembersPage({ searchParams }: PageProps<"/miembros">) {
  const { supabase } = await requireActive();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.f === "string" ? sp.f : "";

  let query = supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, headline, city, created_at")
    .or("status.eq.active,role.eq.admin")
    .order("role", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  if (q) query = query.ilike("full_name", `%${q}%`);
  if (filter === "equipo") query = query.eq("role", "admin");
  const { data } = await query;
  const members = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader eyebrow="Comunidad" title="Miembros" subtitle={`${members.length} ${members.length === 1 ? "persona" : "personas"} aprendiendo juntas.`} />
      <form className="mb-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Buscar por nombre…" />
        <button className="btn-ghost">Buscar</button>
        <Link href={filter === "equipo" ? "/miembros" : "/miembros?f=equipo"} className={`chip h-12 border px-4 ${filter === "equipo" ? "border-brand bg-brand text-on-brand" : "border-line text-muted hover:border-brand hover:text-brand"}`}>
          Solo equipo
        </Link>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((m, i) => (
          <Link
            key={m.id}
            href={`/miembros/${m.id}`}
            className="card card-hover anim-fade-up flex flex-col items-center p-6 text-center"
            style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          >
            <div className="rounded-full ring-2 ring-brand/30 ring-offset-4 ring-offset-surface">
              <Avatar name={m.full_name} url={m.avatar_url} size={76} />
            </div>
            <p className="mt-4 font-display text-lg font-semibold uppercase leading-tight">{m.full_name || "Alumno"}</p>
            {m.role === "admin" && <span className="chip mt-1.5 bg-brand text-on-brand">Equipo</span>}
            {m.headline && <p className="mt-2 line-clamp-2 font-serif text-[15px] italic text-brand">{m.headline}</p>}
            {m.city && <p className="mt-2 text-xs text-muted">📍 {m.city}</p>}
          </Link>
        ))}
      </div>
    </>
  );
}
