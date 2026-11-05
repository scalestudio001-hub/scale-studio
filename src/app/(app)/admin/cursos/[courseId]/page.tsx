import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { addModule, deleteCourse, deleteLesson, deleteModule, saveCourse, saveLessonOrder, saveModule } from "@/app/actions/admin";
import { createLessonDraft } from "@/app/actions/lesson-editor";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { CoverUploader } from "@/components/cover-uploader";
import { toEmbedUrl } from "@/lib/utils";
import type { Course, Lesson, Module } from "@/lib/types";

const byPos = <T extends { position: number; created_at?: string }>(a: T, b: T) =>
  a.position - b.position || String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));

export default async function AdminCoursePage({ params }: PageProps<"/admin/cursos/[courseId]">) {
  const { supabase } = await requireAdmin();
  const { courseId } = await params;
  const [{ data: course }, { data: mods }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle<Course>(),
    supabase.from("modules").select("*, lessons(*)").eq("course_id", courseId),
  ]);
  if (!course) notFound();
  const modules = ((mods ?? []) as (Module & { lessons: Lesson[] })[])
    .sort(byPos)
    .map((m) => ({ ...m, lessons: [...m.lessons].sort(byPos) }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/cursos" className="text-sm font-medium text-muted hover:text-brand">← Todos los cursos</Link>
        <Link href={`/cursos/${course.id}`} className="btn-ghost h-9 text-xs">Ver como alumno ↗</Link>
      </div>

      {/* Datos del curso */}
      <section className="card p-6">
        <p className="eyebrow mb-5">Datos del curso</p>
        <ActionForm action={saveCourse} submitLabel="Guardar curso" buttonClassName="btn-primary">
          <input type="hidden" name="id" value={course.id} />
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <label className="label">Título</label>
              <input name="title" defaultValue={course.title} className="input" required />
            </div>
            <div>
              <label className="label">Orden</label>
              <input name="position" type="number" defaultValue={course.position} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea name="description" defaultValue={course.description ?? ""} className="input min-h-24" />
          </div>
          <div>
            <label className="label">Portada del curso</label>
            <CoverUploader initial={course.cover_url} />
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" name="published" defaultChecked={course.published} className="h-4 w-4 accent-[var(--brand)]" />
            Publicado (visible para los alumnos con este curso en su plan)
          </label>
        </ActionForm>
      </section>

      {/* Módulos y clases */}
      <section className="mt-8 space-y-5">
        <p className="eyebrow">Módulos y clases</p>
        {modules.map((m, i) => (
          <div key={m.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 p-4">
              <span className="font-display text-sm uppercase tracking-[0.2em] text-brand">Módulo {String(i + 1).padStart(2, "0")}</span>
              <form action={saveModule} className="flex flex-1 flex-wrap gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <input name="title" defaultValue={m.title} className="input min-w-48 flex-1 py-2" />
                <input name="position" type="number" defaultValue={m.position} className="input w-20 py-2" title="Orden" />
                <SubmitButton className="btn-ghost h-10">Guardar</SubmitButton>
              </form>
              <form action={deleteModule}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <ConfirmButton message={`¿Eliminar el módulo "${m.title}" y todas sus clases?`} className="btn-danger h-10">Eliminar</ConfirmButton>
              </form>
            </div>

            <div className="divide-y divide-line">
              {m.lessons.map((l) => (
                <div key={l.id} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-surface-2">
                  <span className="w-6 text-center font-display text-muted">{l.position}</span>
                  <Link href={`/admin/cursos/${course.id}/clase/${l.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium group-hover:text-brand">{l.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted">
                      {l.video_path ? "📹 Video subido" : toEmbedUrl(l.video_url) ? "🔗 Video por link" : "Sin video"}
                      {(l.files?.length ?? 0) > 0 && <span>· 📎 {l.files!.length} recursos</span>}
                      {l.duration_min ? <span>· {l.duration_min} min</span> : null}
                    </span>
                  </Link>
                  {l.published === false && <span className="chip border border-line text-muted">Borrador</span>}
                  <form action={saveLessonOrder} className="hidden items-center gap-1 sm:flex">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <input name="position" type="number" defaultValue={l.position} className="input h-8 w-16 px-2 py-0 text-xs" title="Orden" />
                    <button className="text-xs text-muted hover:text-brand" title="Guardar orden">↵</button>
                  </form>
                  <Link href={`/admin/cursos/${course.id}/clase/${l.id}`} className="btn-ghost h-9 px-3 text-xs">✏️ Editar</Link>
                  <form action={deleteLesson}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <ConfirmButton message={`¿Eliminar la clase "${l.title}"?`} className="px-1 text-xs text-muted hover:text-red-400">🗑️</ConfirmButton>
                  </form>
                </div>
              ))}
              <form action={createLessonDraft} className="flex flex-wrap gap-2 px-5 py-3">
                <input type="hidden" name="module_id" value={m.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <input name="title" className="input h-10 min-w-48 flex-1 py-0" placeholder="Título de la nueva clase" />
                <SubmitButton className="btn-outline h-10" pendingText="Creando…">+ Agregar clase</SubmitButton>
              </form>
            </div>
          </div>
        ))}

        <div className="card p-5">
          <ActionForm action={addModule} submitLabel="+ Agregar módulo" className="flex flex-wrap items-start gap-2" buttonClassName="btn-outline" resetOnSuccess>
            <input type="hidden" name="course_id" value={course.id} />
            <input name="title" className="input min-w-60 flex-1" placeholder="Título del nuevo módulo" required />
          </ActionForm>
        </div>
      </section>

      <form action={deleteCourse} className="mt-10 border-t border-line pt-6">
        <input type="hidden" name="id" value={course.id} />
        <ConfirmButton message={`¿Eliminar el curso "${course.title}" completo? No se puede deshacer.`}>Eliminar curso</ConfirmButton>
      </form>
    </>
  );
}
