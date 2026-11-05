import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { addComment, deleteComment, deletePost, togglePin } from "@/app/actions/community";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Avatar, RichText } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Comment } from "@/lib/types";
import { PostCard, type PostRow } from "../post-card";

export default async function PostPage({ params }: PageProps<"/comunidad/[postId]">) {
  const { supabase, user, profile } = await requireActive();
  const { postId } = await params;

  const [{ data: post }, { data: comments }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, author:profiles!posts_author_id_fkey(full_name, avatar_url, role), post_likes(user_id), comments(id)")
      .eq("id", postId)
      .maybeSingle<PostRow>(),
    supabase
      .from("comments")
      .select("*, author:profiles!comments_author_id_fkey(full_name, avatar_url, role)")
      .eq("post_id", postId)
      .order("created_at"),
  ]);
  if (!post) notFound();

  const isAdmin = profile.role === "admin";
  const canDelete = isAdmin || post.author_id === user.id;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/comunidad" className="text-sm font-medium text-muted hover:text-brand">← Comunidad</Link>
      <div className="mt-3">
        <PostCard post={post} userId={user.id} full />
      </div>

      {(isAdmin || canDelete) && (
        <div className="mt-3 flex gap-2">
          {isAdmin && (
            <form action={togglePin}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="pinned" value={post.pinned ? "1" : "0"} />
              <button className="btn-ghost h-9 text-xs">{post.pinned ? "Desfijar" : "📌 Fijar arriba"}</button>
            </form>
          )}
          {canDelete && (
            <form action={deletePost}>
              <input type="hidden" name="postId" value={post.id} />
              <ConfirmButton message="¿Eliminar esta publicación?" className="btn-danger h-9 text-xs">Eliminar</ConfirmButton>
            </form>
          )}
        </div>
      )}

      <section className="mt-8">
        <p className="eyebrow mb-5">Comentarios</p>
        <div className="space-y-3">
          {((comments ?? []) as Comment[]).map((c) => (
            <div key={c.id} className="card flex gap-3 p-4">
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
                  <ConfirmButton message="¿Eliminar este comentario?" className="text-xs text-muted hover:text-red-400">✕</ConfirmButton>
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
