import Link from "next/link";
import { toggleLike } from "@/app/actions/community";
import { Avatar, RichText } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Post } from "@/lib/types";

export type PostRow = Post & { post_likes: { user_id: string }[]; comments: { count: number }[] };

export function PostCard({ post, userId, full = false }: { post: PostRow; userId: string; full?: boolean }) {
  const liked = post.post_likes.some((l) => l.user_id === userId);
  const likes = post.post_likes.length;
  const comments = post.comments?.[0]?.count ?? 0;
  const name = post.author?.full_name || "Alumno";

  return (
    <article className={`card p-5 sm:p-6 ${post.pinned ? "border-brand/50" : ""}`}>
      <header className="flex items-center gap-3">
        <Avatar name={name} url={post.author?.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {name}
            {post.author?.role === "admin" && <span className="chip bg-brand text-on-brand">Equipo</span>}
          </p>
          <p className="text-xs text-muted">
            {timeAgo(post.created_at)} · <span className="text-brand">{post.category}</span>
          </p>
        </div>
        {post.pinned && <span className="chip border border-brand/50 text-brand">📌 Fijado</span>}
      </header>

      {full ? (
        <>
          <h1 className="display mt-5 text-3xl">{post.title}</h1>
          <RichText text={post.body} className="mt-3 text-[15px] text-ink/85" />
        </>
      ) : (
        <Link href={`/comunidad/${post.id}`} className="mt-4 block">
          <h2 className="text-lg font-semibold leading-snug hover:text-brand">{post.title}</h2>
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[15px] text-ink/70">{post.body}</p>
        </Link>
      )}

      <footer className="mt-5 flex items-center gap-2 border-t border-line pt-4">
        <form action={toggleLike}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="liked" value={liked ? "1" : "0"} />
          <button className={`btn h-9 px-3 text-xs ${liked ? "bg-brand-soft text-brand" : "text-muted hover:text-brand"}`}>
            {liked ? "♥" : "♡"} {likes}
          </button>
        </form>
        <Link href={`/comunidad/${post.id}`} className="btn h-9 px-3 text-xs text-muted hover:text-brand">
          💬 {comments} {comments === 1 ? "comentario" : "comentarios"}
        </Link>
      </footer>
    </article>
  );
}
