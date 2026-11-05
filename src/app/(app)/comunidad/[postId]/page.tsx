import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { addComment, deleteComment, updatePost } from "@/app/actions/community";
import { POST_SELECT, withAttachmentUrls, type PostRow } from "@/lib/community";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Avatar, RichText } from "@/components/ui";
import { COMMUNITY_CATEGORIES, timeAgo } from "@/lib/utils";
import type { Comment } from "@/lib/types";
import { PostCard } from "../post-card";

export default async function PostPage({ params, searchParams }: PageProps<"/comunidad/[postId]">) {
  const { supabase, user, profile } = await requireActive();
  const { postId } = await params;
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";

  const [{ data: raw }, { data: comments }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("id", postId).maybeSingle(),
    supabase
      .from("comments")
      .select("*, author:profiles!comments_author_id_fkey(full_name, avatar_url, role)")
      .eq("post_id", postId)
      .order("created_at"),
  ]);
  if (!raw) notFound();
  const [post] = await withAttachmentUrls([raw as unknown as PostRow]);
  const editing = sp.editar === "1" && post.author_id === user.id;
  const cats = COMMUNITY_CATEGORIES.filter((c) => isAdmin || c !== "Anuncios");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/comunidad" className="text-sm font-medium text-muted hover:text-brand">← Comunidad</Link>

      <div className="mt-3">
        {editing ? (
          <div className="card p-6">
            <p className="eyebrow mb-5">Editar publicación</p>
            <ActionForm action={updatePost} submitLabel="Guardar cambios" buttonClassName="btn-primary">
              <input type="hidden" name="postId" value={post.id} />
              <input name="title" defaultValue={post.title} className="input font-display text-xl uppercase" required maxLength={140} />
              <textarea name="body" defaultValue={post.body} className="input min-h-40" />
              <input name="link_url" defaultValue={post.link_url ?? ""} className="input" placeholder="Link o video de YouTube/Vimeo (opcional)" />
              <select name="category" defaultValue={post.category} className="input">
                {cats.map((c) => <option key={c}>{c}</option>)}
              </select>
            </ActionForm>
            <Link href={`/comunidad/${post.id}`} className="mt-3 inline-block text-sm text-muted hover:text-ink">Cancelar</Link>
          </div>
        ) : (
          <PostCard post={post} userId={user.id} isAdmin={isAdmin} full />
        )}
      </div>

      <section className="mt-8">
        <p className="eyebrow mb-5">Comentarios ({(comments ?? []).length})</p>
        <div className="space-y-3">
          {((comments ?? []) as Comment[]).map((c) => (
            <div key={c.id} className="card group flex gap-3 p-4">
              <Avatar name={c.author?.full_name || "Alumno"} url={c.author?.avatar_url} size={34} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {c.author?.full_name || "Alumno"}
                  {c.author?.role === "admin" && <span className="chip bg-brand text-on-brand">Equipo</span>}
                  <span className="text-xs font-normal text-muted">{timeAgo(c.created_at)}</span>
                </p>
                <RichText text={c.body} className="mt-1 text-[15px] text-ink/85" />
              </div>
              {(isAdmin || c.author_id === user.id) && (
                <form action={deleteComment}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="commentId" value={c.id} />
                  <ConfirmButton message="¿Eliminar este comentario?" className="text-xs text-muted opacity-60 transition hover:text-red-400 group-hover:opacity-100">
                    🗑️
                  </ConfirmButton>
                </form>
              )}
            </div>
          ))}
        </div>

        <div className="card mt-4 p-4">
          <ActionForm action={addComment} submitLabel="Comentar" pendingText="Enviando…" className="space-y-3" buttonClassName="btn-primary h-10" resetOnSuccess>
            <input type="hidden" name="postId" value={post.id} />
            <textarea name="body" className="input min-h-24" placeholder="Escribe un comentario…" required />
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
