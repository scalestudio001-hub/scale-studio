import Link from "next/link";
import { deletePost, toggleLike, togglePin, vote } from "@/app/actions/community";
import { ConfirmButton } from "@/components/forms";
import { Avatar, RichText } from "@/components/ui";
import { timeAgo, toEmbedUrl } from "@/lib/utils";
import type { PostRow } from "@/lib/community";

export type { PostRow };

function isVideoLink(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com|mediadelivery\.net|bunnycdn\.com/.test(url);
}

export function PostCard({
  post,
  userId,
  isAdmin,
  full = false,
}: {
  post: PostRow;
  userId: string;
  isAdmin: boolean;
  full?: boolean;
}) {
  const liked = post.post_likes.some((l) => l.user_id === userId);
  const likes = post.post_likes.length;
  const comments = post.comments?.length ?? 0;
  const name = post.author?.full_name || "Alumno";
  const isAuthor = post.author_id === userId;
  const canDelete = isAuthor || isAdmin;

  const options = [...(post.poll_options ?? [])].sort((a, b) => a.position - b.position);
  const votes = post.poll_votes ?? [];
  const myVote = votes.find((v) => v.user_id === userId)?.option_id ?? "";
  const totalVotes = votes.length;

  const embed = post.link_url && isVideoLink(post.link_url) ? toEmbedUrl(post.link_url) : null;
  let host = "";
  if (post.link_url && !embed) {
    try {
      host = new URL(post.link_url).hostname.replace(/^www\./, "");
    } catch {}
  }

  return (
    <article className={`card p-5 transition hover:border-brand/30 sm:p-6 ${post.pinned ? "border-brand/50" : ""}`}>
      <header className="flex items-center gap-3">
        <Link href={`/miembros/${post.author_id}`} className="shrink-0 transition hover:opacity-80">
          <Avatar name={name} url={post.author?.avatar_url} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Link href={`/miembros/${post.author_id}`} className="hover:text-brand">{name}</Link>
            {post.author?.role === "admin" && <span className="chip bg-brand text-on-brand">Equipo</span>}
          </p>
          <p className="text-xs text-muted">
            {timeAgo(post.created_at)}
            {post.edited_at && " · editado"} · <span className="text-brand">{post.category}</span>
          </p>
        </div>
        {post.pinned && <span className="chip border border-brand/50 text-brand">📌 Fijado</span>}

        {(isAdmin || canDelete) && (
          <details className="relative">
            <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md text-xl text-muted hover:bg-surface-2 hover:text-ink">⋯</summary>
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-2xl shadow-black/60">
              {isAdmin && (
                <form action={togglePin}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="pinned" value={post.pinned ? "1" : "0"} />
                  <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-2">{post.pinned ? "Desfijar" : "📌 Fijar arriba"}</button>
                </form>
              )}
              {isAuthor && (
                <Link href={`/comunidad/${post.id}?editar=1`} className="block px-4 py-2.5 text-sm hover:bg-surface-2">
                  ✏️ Editar
                </Link>
              )}
              {canDelete && (
                <form action={deletePost}>
                  <input type="hidden" name="postId" value={post.id} />
                  {!full && <input type="hidden" name="stay" value="1" />}
                  <ConfirmButton message="¿Eliminar esta publicación? No se puede deshacer." className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-surface-2">
                    🗑️ Eliminar
                  </ConfirmButton>
                </form>
              )}
            </div>
          </details>
        )}
      </header>

      {full ? (
        <>
          <h1 className="display mt-5 text-3xl">{post.title}</h1>
          {post.body && <RichText text={post.body} className="mt-3 text-[15px] text-ink/85" />}
        </>
      ) : (
        <Link href={`/comunidad/${post.id}`} className="mt-4 block">
          <h2 className="text-lg font-semibold leading-snug hover:text-brand">{post.title}</h2>
          {post.body && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[15px] text-ink/70">{post.body}</p>}
        </Link>
      )}

      {/* Imagen o video subido */}
      {post.attachment_url && (
        <div className="mt-4 overflow-hidden rounded-md border border-line bg-black">
          {post.attachment_type === "video" ? (
            <video src={post.attachment_url} controls playsInline preload="metadata" className="max-h-[480px] w-full" />
          ) : (
            <a href={post.attachment_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.attachment_url} alt="" className={`w-full object-contain ${full ? "max-h-[640px]" : "max-h-[420px]"}`} />
            </a>
          )}
        </div>
      )}

      {/* Video de YouTube / Vimeo */}
      {embed && (
        <div className="mt-4 aspect-video overflow-hidden rounded-md border border-line bg-black">
          <iframe src={embed} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen title={post.title} />
        </div>
      )}

      {/* Link */}
      {post.link_url && !embed && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-3 rounded-md border border-line bg-surface-2 p-3 transition hover:border-brand/50"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand-soft text-lg">🔗</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{host || post.link_url}</span>
            <span className="block truncate text-xs text-muted">{post.link_url}</span>
          </span>
        </a>
      )}

      {/* Encuesta */}
      {options.length >= 2 && (
        <div className="mt-4 space-y-2 rounded-md border border-line p-4">
          <p className="label">📊 Encuesta · {totalVotes} {totalVotes === 1 ? "voto" : "votos"}</p>
          {options.map((o) => {
            const n = votes.filter((v) => v.option_id === o.id).length;
            const pct = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
            const mine = myVote === o.id;
            return (
              <form key={o.id} action={vote}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="optionId" value={o.id} />
                <input type="hidden" name="current" value={myVote} />
                <button
                  className={`relative w-full overflow-hidden rounded-md border px-4 py-2.5 text-left text-sm transition ${
                    mine ? "border-brand" : "border-line hover:border-brand/50"
                  }`}
                >
                  <span className="absolute inset-y-0 left-0 bg-brand-soft transition-all duration-700" style={{ width: `${myVote ? pct : 0}%` }} />
                  <span className="relative flex justify-between gap-3">
                    <span className={mine ? "font-semibold text-brand" : ""}>
                      {mine ? "✓ " : ""}
                      {o.label}
                    </span>
                    {myVote && <span className="text-muted">{pct}%</span>}
                  </span>
                </button>
              </form>
            );
          })}
          {!myVote && <p className="text-xs text-muted">Vota para ver los resultados.</p>}
        </div>
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
