import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { getAccessibleCourseIds } from "@/lib/courses";
import { Avatar, PageHeader } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Buscar" };

function Section({ title, children, n }: { title: string; n: number; children: React.ReactNode }) {
  if (!n) return null;
  return (
    <section className="mb-8">
      <p className="eyebrow mb-3">{title} ({n})</p>
      <div className="card divide-y divide-line">{children}</div>
    </section>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/buscar">) {
  const { supabase } = await requireActive();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const like = `%${q.replace(/[%_,()]/g, " ")}%`;

  if (!q) return <PageHeader eyebrow="Buscar" title="¿Qué buscas?" subtitle="Usa el buscador de arriba (Ctrl + K)." />;

  const [{ data: courses }, { data: lessons }, { data: posts }, { data: people }, access] = await Promise.all([
    supabase.from("courses").select("id, title, description").or(`title.ilike.${like},description.ilike.${like}`).limit(10),
    supabase.from("lessons").select("id, title, description, modules!inner(course_id, title)").or(`title.ilike.${like},description.ilike.${like}`).limit(20),
    supabase.from("posts").select("id, title, body, created_at").or(`title.ilike.${like},body.ilike.${like}`).order("created_at", { ascending: false }).limit(15),
    supabase.from("profiles").select("id, full_name, avatar_url, headline").ilike("full_name", like).or("status.eq.active,role.eq.admin").limit(12),
    getAccessibleCourseIds(),
  ]);
  const ls = (lessons ?? []) as unknown as { id: string; title: string; description: string | null; modules: { course_id: string; title: string } }[];
  const total = (courses?.length ?? 0) + ls.length + (posts?.length ?? 0) + (people?.length ?? 0);
  const has = (id: string) => access === "all" || access.has(id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Buscar" title={`“${q}”`} subtitle={total ? `${total} resultados` : "No encontramos resultados. Prueba con otra palabra."} />
      <Section title="Clases" n={ls.length}>
        {ls.map((l) => (
          <Link key={l.id} href={`/cursos/${l.modules.course_id}/${l.id}`} className="block px-5 py-3.5 transition hover:bg-surface-2">
            <p className="font-semibold">▶ {l.title}</p>
            <p className="text-xs text-muted">{l.modules.title}</p>
          </Link>
        ))}
      </Section>
      <Section title="Cursos" n={courses?.length ?? 0}>
        {(courses ?? []).map((c) => (
          <Link key={c.id} href={has(c.id) ? `/cursos/${c.id}` : "/cursos"} className="block px-5 py-3.5 transition hover:bg-surface-2">
            <p className="font-semibold">📚 {c.title} {!has(c.id) && <span className="text-xs text-muted">🔒</span>}</p>
            {c.description && <p className="line-clamp-1 text-xs text-muted">{c.description}</p>}
          </Link>
        ))}
      </Section>
      <Section title="Comunidad" n={posts?.length ?? 0}>
        {(posts ?? []).map((p) => (
          <Link key={p.id} href={`/comunidad/${p.id}`} className="block px-5 py-3.5 transition hover:bg-surface-2">
            <p className="font-semibold">{p.title}</p>
            <p className="line-clamp-1 text-xs text-muted">{timeAgo(p.created_at)} · {p.body}</p>
          </Link>
        ))}
      </Section>
      <Section title="Miembros" n={people?.length ?? 0}>
        {(people ?? []).map((m) => (
          <Link key={m.id} href={`/miembros/${m.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface-2">
            <Avatar name={m.full_name} url={m.avatar_url} size={34} />
            <span>
              <span className="block font-semibold">{m.full_name}</span>
              {m.headline && <span className="block text-xs text-brand">{m.headline}</span>}
            </span>
          </Link>
        ))}
      </Section>
    </div>
  );
}
