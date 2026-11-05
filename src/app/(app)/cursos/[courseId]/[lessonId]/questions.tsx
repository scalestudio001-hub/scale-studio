import Link from "next/link";
import { addLessonComment, deleteLessonComment } from "@/app/actions/extras";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Avatar, RichText } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Author } from "@/lib/types";

export type LessonComment = {
  id: string; lesson_id: string; author_id: string; parent_id: string | null; body: string; created_at: string; author: Author | null;
};

function Item({ c, userId, isAdmin, courseId, small = false }: { c: LessonComment; userId: string; isAdmin: boolean; courseId: string; small?: boolean }) {
  return (
    <div className="group flex gap-3">
      <Link href={`/miembros/${c.author_id}`} className="shrink-0">
        <Avatar name={c.author?.full_name || "Alumno"} url={c.author?.avatar_url} size={small ? 28 : 36} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/miembros/${c.author_id}`} className="font-semibold hover:text-brand">{c.author?.full_name || "Alumno"}</Link>
          {c.author?.role === "admin" && <span className="chip bg-brand py-0 text-[9px] text-on-brand">Equipo</span>}
          <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
          {(isAdmin || c.author_id === userId) && (
            <form action={deleteLessonComment} className="ml-auto opacity-0 transition group-hover:opacity-100">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="lesson_id" value={c.lesson_id} />
              <input type="hidden" name="course_id" value={courseId} />
              <ConfirmButton message="¿Eliminar este comentario?" className="text-xs text-muted hover:text-red-400">🗑️</ConfirmButton>
            </form>
          )}
        </p>
        <RichText text={c.body} className="mt-0.5 text-[15px] text-ink/85" />
      </div>
    </div>
  );
}

export function LessonQuestions({
  comments, lessonId, courseId, userId, isAdmin,
}: { comments: LessonComment[]; lessonId: string; courseId: string; userId: string; isAdmin: boolean }) {
  const roots = comments.filter((c) => !c.parent_id);
  const replies = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <section id="preguntas" className="card mt-6 scroll-mt-24 p-5 sm:p-6">
      <p className="eyebrow mb-1">Preguntas y comentarios</p>
      <p className="mb-5 text-sm text-muted">¿Te quedó alguna duda de esta clase? Pregunta aquí y el equipo te responde 👇</p>

      <ActionForm action={addLessonComment} submitLabel="Publicar pregunta" pendingText="Publicando…" className="space-y-3" buttonClassName="btn-primary h-10" resetOnSuccess>
        <input type="hidden" name="lesson_id" value={lessonId} />
        <input type="hidden" name="course_id" value={courseId} />
        <textarea name="body" className="input min-h-20" placeholder="Escribe tu pregunta o comentario…" maxLength={2000} required />
      </ActionForm>

      <div className="mt-6 space-y-5">
        {roots.length === 0 && <p className="text-sm text-muted">Todavía no hay preguntas en esta clase.</p>}
        {roots.map((c) => (
          <div key={c.id} className="rounded-md border border-line p-4">
            <Item c={c} userId={userId} isAdmin={isAdmin} courseId={courseId} />
            {replies(c.id).length > 0 && (
              <div className="ml-6 mt-4 space-y-3 border-l-2 border-brand/30 pl-4">
                {replies(c.id).map((r) => (
                  <Item key={r.id} c={r} userId={userId} isAdmin={isAdmin} courseId={courseId} small />
                ))}
              </div>
            )}
            <details className="ml-12 mt-3">
              <summary className="cursor-pointer list-none text-xs font-semibold text-brand">↩ Responder</summary>
              <ActionForm action={addLessonComment} submitLabel="Responder" className="mt-2 space-y-2" buttonClassName="btn-ghost h-9" resetOnSuccess>
                <input type="hidden" name="lesson_id" value={lessonId} />
                <input type="hidden" name="course_id" value={courseId} />
                <input type="hidden" name="parent_id" value={c.id} />
                <textarea name="body" className="input min-h-16 text-sm" placeholder="Tu respuesta…" required />
              </ActionForm>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}
