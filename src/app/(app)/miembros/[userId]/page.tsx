import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { Avatar, RichText } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { openDm } from "@/app/actions/extras";
import { SubmitButton } from "@/components/forms";
import type { Profile } from "@/lib/types";

export default async function MemberPage({ params }: PageProps<"/miembros/[userId]">) {
  const { supabase, user } = await requireActive();
  const { userId } = await params;

  const [{ data: p }, { data: posts }, { count: postCount }, { count: commentCount }, { count: likeCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>(),
    supabase.from("posts").select("id, title, category, created_at").eq("author_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("post_likes").select("post_id, posts!inner(author_id)", { count: "exact", head: true }).eq("posts.author_id", userId),
  ]);
  if (!p) notFound();
  const me = user.id === p.id;
  const since = new Date(p.created_at).toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/miembros" className="text-sm font-medium text-muted hover:text-brand">← Miembros</Link>

      <div className="card mt-3 overflow-hidden">
        {/* portada */}
        <div className="relative h-36 overflow-hidden bg-black sm:h-44">
          <div className="anim-glow-a absolute -left-20 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.35),transparent_62%)]" />
          <span className="absolute -bottom-10 right-[8%] h-[200%] w-24 -skew-x-[32deg] bg-gradient-to-b from-brand-light via-brand to-brand-dark opacity-90" />
          <span className="absolute -bottom-10 right-[3%] h-[200%] w-3 -skew-x-[32deg] bg-[#D8D5CC]/80" />
          <div className="grain" />
        </div>
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
            <div className="rounded-full bg-surface p-1.5 ring-2 ring-brand">
              <Avatar name={p.full_name} url={p.avatar_url} size={116} />
            </div>
            {me ? (
              <Link href="/perfil" className="btn-outline h-10">✏️ Editar perfil</Link>
            ) : (
              <form action={openDm}>
                <input type="hidden" name="user_id" value={p.id} />
                <SubmitButton className="btn-primary h-10" pendingText="Abriendo…">✉️ Enviar mensaje</SubmitButton>
              </form>
            )}
          </div>
          <h1 className="display mt-4 text-4xl">{p.full_name || "Alumno"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {p.role === "admin" && <span className="chip bg-brand text-on-brand">Equipo</span>}
            {p.headline && <span className="font-serif text-lg italic text-brand">{p.headline}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {p.city && <span>📍 {p.city}</span>}
            <span>🗓️ Miembro desde {since}</span>
            {p.instagram && (
              <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand">📸 @{p.instagram}</a>
            )}
            {p.website && (
              <a href={p.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand">🔗 {p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>
            )}
          </div>
          {p.bio ? (
            <RichText text={p.bio} className="mt-5 max-w-2xl text-[15px] text-ink/85" />
          ) : (
            me && <p className="mt-5 text-sm text-muted">Aún no tienes biografía. <Link href="/perfil" className="text-brand underline">Agrégala aquí</Link>.</p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
            {[
              { l: "Publicaciones", v: postCount ?? 0 },
              { l: "Comentarios", v: commentCount ?? 0 },
              { l: "Me gusta recibidos", v: likeCount ?? 0 },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-display text-3xl font-semibold text-brand">{s.v}</p>
                <p className="text-xs uppercase tracking-[0.15em] text-muted">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <p className="eyebrow mb-4">Publicaciones recientes</p>
        {(posts ?? []).length === 0 ? (
          <p className="card p-5 text-sm text-muted">Todavía no ha publicado en la comunidad.</p>
        ) : (
          <div className="card divide-y divide-line">
            {(posts ?? []).map((x) => (
              <Link key={x.id} href={`/comunidad/${x.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-2">
                <span className="flex-1 font-semibold">{x.title}</span>
                <span className="text-xs text-brand">{x.category}</span>
                <span className="w-24 text-right text-xs text-muted">{timeAgo(x.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
