import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { getCompletedLessonIds, getCourseTree } from "@/lib/courses";
import { EmptyState, ProgressBar, RichText } from "@/components/ui";

export default async function CoursePage({ params }: PageProps<"/cursos/[courseId]">) {
  await requireActive();
  const { courseId } = await params;
  const data = await getCourseTree(courseId);
  if (!data) notFound();
  const { course, modules, lessons, hasAccess } = data;

  if (!hasAccess)
    return (
      <EmptyState title="🔒 Este curso no está en tu plan" text="Escríbele al equipo si quieres sumarlo.">
        <Link href="/cursos" className="btn-ghost">← Volver a cursos</Link>
      </EmptyState>
    );

  const done = await getCompletedLessonIds();
  const completed = lessons.filter((l) => done.has(l.id)).length;
  const progress = lessons.length ? (completed / lessons.length) * 100 : 0;
  const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];

  return (
    <>
      <Link href="/cursos" className="text-sm font-medium text-muted hover:text-brand">← Cursos</Link>
      <div className="card mt-3 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px] md:p-8">
          <div>
            <h1 className="display text-4xl sm:text-5xl">{course.title}</h1>
            {course.description && <RichText text={course.description} className="mt-3 text-muted" />}
          </div>
          <div className="rounded-md bg-surface-2 p-5">
            <p className="text-sm font-semibold">Tu avance</p>
            <div className="mt-2"><ProgressBar value={progress} /></div>
            <p className="mt-1.5 text-xs text-muted">{completed} de {lessons.length} lecciones</p>
            {next && (
              <Link href={`/cursos/${course.id}/${next.id}`} className="btn-primary mt-4 w-full">
                {completed === 0 ? "Empezar curso" : completed === lessons.length ? "Repasar" : "Continuar"} →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {modules.length === 0 && <EmptyState title="Este curso todavía no tiene clases" text="Muy pronto se van a subir." />}
        {modules.map((m, i) => (
          <section key={m.id} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
                <span className="mr-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-brand">Módulo {String(i + 1).padStart(2, "0")}</span>
                {m.title}
              </h2>
              <span className="text-xs font-semibold text-muted">
                {m.lessons.filter((l) => done.has(l.id)).length}/{m.lessons.length}
              </span>
            </div>
            <ul>
              {m.lessons.map((l) => (
                <li key={l.id} className="border-b border-line last:border-0">
                  <Link href={`/cursos/${course.id}/${l.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${
                        done.has(l.id) ? "bg-brand text-on-brand" : "border-2 border-line"
                      }`}
                    >
                      {done.has(l.id) && "✓"}
                    </span>
                    <span className="flex-1 text-[15px]">{l.title}</span>
                    {l.duration_min ? <span className="text-xs text-muted">{l.duration_min} min</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
