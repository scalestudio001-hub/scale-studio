import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { createPost } from "@/app/actions/community";
import { ActionForm } from "@/components/forms";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { COMMUNITY_CATEGORIES } from "@/lib/utils";
import { PostCard, type PostRow } from "./post-card";

export const metadata: Metadata = { title: "Comunidad" };

export default async function CommunityPage({ searchParams }: PageProps<"/comunidad">) {
  const { supabase, user, profile } = await requireActive();
  const sp = await searchParams;
  const cat = typeof sp.cat === "string" ? sp.cat : "";

  let q = supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(full_name, avatar_url, role), post_likes(user_id), comments(id)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (cat) q = q.eq("category", cat);
  const { data, error } = await q;
  if (error) console.error("comunidad:", error.message);
  const posts = (data ?? []) as PostRow[];
  const isAdmin = profile.role === "admin";
  const cats = COMMUNITY_CATEGORIES.filter((c) => isAdmin || c !== "Anuncios");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Comunidad" title="Comparte y aprende" subtitle="Haz tus preguntas, comparte tus logros y ayuda a otros alumnos." />

      <details className="card group mb-6 p-5">
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <Avatar name={profile.full_name} url={profile.avatar_url} />
          <span className="flex-1 rounded-md border border-line bg-bg px-4 py-3 text-muted group-open:hidden">Escribe algo…</span>
          <span className="hidden flex-1 font-semibold group-open:block">Nueva publicación</span>
        </summary>
        <ActionForm action={createPost} submitLabel="Publicar" pendingText="Publicando…" className="mt-4 space-y-3" buttonClassName="btn-primary" resetOnSuccess>
          <input name="title" className="input" placeholder="Título" required maxLength={140} />
          <textarea name="body" className="input min-h-32" placeholder="¿Qué quieres compartir?" required />
          <select name="category" className="input" defaultValue="General">
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </ActionForm>
      </details>

      <div className="mb-5 flex flex-wrap gap-2">
        {["", ...COMMUNITY_CATEGORIES].map((c) => (
          <Link
            key={c || "all"}
            href={c ? `/comunidad?cat=${encodeURIComponent(c)}` : "/comunidad"}
            className={`chip h-8 border px-3.5 ${cat === c ? "border-brand bg-brand text-on-brand" : "border-line text-muted hover:border-brand hover:text-brand"}`}
          >
            {c || "Todo"}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {error && <p className="card p-4 text-sm text-red-400">No se pudieron cargar las publicaciones: {error.message}</p>}
        {!error && posts.length === 0 && <EmptyState title="Todavía no hay publicaciones" text="¡Sé el primero en escribir algo!" />}
        {posts.map((p) => <PostCard key={p.id} post={p} userId={user.id} />)}
      </div>
    </div>
  );
}
