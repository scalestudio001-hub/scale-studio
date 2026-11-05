import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { POST_SELECT, withAttachmentUrls, type PostRow } from "@/lib/community";
import { PostComposer } from "@/components/post-composer";
import { EmptyState, PageHeader } from "@/components/ui";
import { COMMUNITY_CATEGORIES } from "@/lib/utils";
import { PostCard } from "./post-card";

export const metadata: Metadata = { title: "Comunidad" };

export default async function CommunityPage({ searchParams }: PageProps<"/comunidad">) {
  const { supabase, user, profile } = await requireActive();
  const sp = await searchParams;
  const cat = typeof sp.cat === "string" ? sp.cat : "";
  const isAdmin = profile.role === "admin";

  let q = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (cat) q = q.eq("category", cat);
  const { data, error } = await q;
  if (error) console.error("comunidad:", error.message);
  const posts = await withAttachmentUrls((data ?? []) as unknown as PostRow[]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Comunidad" title="Comparte y aprende" subtitle="Haz tus preguntas, comparte tus logros y ayuda a otros alumnos." />

      <PostComposer me={{ id: user.id, full_name: profile.full_name, avatar_url: profile.avatar_url }} isAdmin={isAdmin} />

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
        {posts.map((p) => (
          <PostCard key={p.id} post={p} userId={user.id} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  );
}
