import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { getCompletedLessonIds, getCourseTree } from "@/lib/courses";
import { toggleLesson } from "@/app/actions/progress";
import { SubmitButton } from "@/components/forms";
import { ProgressBar, RichText } from "@/components/ui";
import { parseResources, toEmbedUrl } from "@/lib/utils";
import { LessonQuestions, type LessonComment } from "./questions";
import { ResourceList, type ResourceItem } from "@/components/resource-list";
import type { LessonFile } from "@/lib/types";

export default async function LessonPage({ params }: PageProps<"/cursos/[courseId]/[lessonId]">) {
  const { supabase, user, profile } = await requireActive();
  const { courseId, lessonId } = await params;
  const data = await getCourseTree(courseId);
  if (!data) notFound();
  if (!data.hasAccess) redirect(`/cursos/${courseId}`);

  const { course, modules, lessons } = data;
  const idx = lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) notFound();
  const lesson = lessons[idx];
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];

  const [done, { data: qs }] = await Promise.all([
    getCompletedLessonIds(),
    supabase
      .from("lesson_comments")
      .select("id, lesson_id, author_id, parent_id, body, created_at, author:profiles!lesson_comments_author_id_fkey(full_name, avatar_url, role)")
      .eq("lesson_id", lessonId)
      .order("created_at"),
  ]);
  const isDone = done.has(lesson.id);
  const completed = lessons.filter((l) => done.has(l.id)).length;
  const embed = lesson.video_path ? null : toEmbedUrl(lesson.video_url);
  const files = (lesson.files ?? []) as LessonFile[];
  const paths = [lesson.video_path, ...files.map((f) => f.path)].filter((x): x is string => !!x);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("lessons").createSignedUrls(paths, 60 * 60 * 6);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }
  const videoFile = lesson.video_path ? signed.get(lesson.video_path) : null;
  const resources: ResourceItem[] = [
    ...files.filter((f) => signed.has(f.path)).map((f) => ({ name: f.name, url: signed.get(f.path)!, type: f.type, size: f.size })),
    ...parseResources(lesson.resources).map((r) => ({ name: r.label, url: r.href, type: "link", external: true })),
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      {/* Índice del curso */}
      <aside className="card h-fit overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
        <div className="border-b border-line p-4">
          <Link href={`/cursos/${course.id}`} className="text-xs font-medium text-muted hover:text-brand">← {course.title}</Link>
          <div className="mt-3"><ProgressBar value={lessons.length ? (completed / lessons.length) * 100 : 0} /></div>
        </div>
        {modules.map((m) => (
          <div key={m.id}>
            <p className="bg-surface-2 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted">{m.title}</p>
            <ul>
              {m.lessons.map((l) => {
                const active = l.id === lesson.id;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/cursos/${course.id}/${l.id}`}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm ${
                        active ? "bg-brand-soft font-semibold text-brand" : "hover:bg-surface-2"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                          done.has(l.id) ? "bg-brand text-on-brand" : "border-2 border-line"
                        }`}
                      >
                        {done.has(l.id) && "✓"}
                      </span>
                      <span className="flex-1">{l.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {/* Clase */}
      <article className="min-w-0">
        <div className="card overflow-hidden">
          {videoFile ? (
            <div className="aspect-video bg-black">
              <video src={videoFile} controls playsInline controlsList="nodownload" className="h-full w-full" />
            </div>
          ) : embed ? (
            <div className="aspect-video bg-black">
              <iframe
                src={embed}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                title={lesson.title}
              />
            </div>
          ) : null}
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted">Clase {idx + 1} de {lessons.length}</p>
                <h1 className="mt-1 display text-3xl">{lesson.title}</h1>
              </div>
              <form action={toggleLesson}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="done" value={isDone ? "1" : "0"} />
                <SubmitButton className={isDone ? "btn-ghost" : "btn-primary"} pendingText="…">
                  {isDone ? "✓ Completada" : "Marcar como completada"}
                </SubmitButton>
              </form>
            </div>

            {lesson.content_html ? (
              <div className="prose-lesson mt-5" dangerouslySetInnerHTML={{ __html: lesson.content_html }} />
            ) : (
              lesson.description && <RichText text={lesson.description} className="mt-5 text-[15px] text-ink/85" />
            )}
            {lesson.published === false && <p className="mt-4 rounded-md border border-brand/40 bg-brand-soft px-3 py-2 text-xs text-brand">👁 Esta clase está en borrador: solo el equipo la ve.</p>}

            {resources.length > 0 && <ResourceList items={resources} />}
          </div>
        </div>

        <LessonQuestions
          comments={(qs ?? []) as unknown as LessonComment[]}
          lessonId={lesson.id}
          courseId={course.id}
          userId={user.id}
          isAdmin={profile.role === "admin"}
        />

        <div className="mt-5 flex justify-between gap-3">
          {prev ? (
            <Link href={`/cursos/${course.id}/${prev.id}`} className="btn-ghost">← Anterior</Link>
          ) : <span />}
          {next && (
            <Link href={`/cursos/${course.id}/${next.id}`} className="btn-primary">Siguiente clase →</Link>
          )}
        </div>
      </article>
    </div>
  );
}
