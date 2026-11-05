import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  addLesson, addModule, deleteCourse, deleteLesson, deleteModule, saveCourse, saveLesson, saveModule,
} from "@/app/actions/admin";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { toEmbedUrl } from "@/lib/utils";
import type { Course, Lesson, Module } from "@/lib/types";

const byPos = <T extends { position: number; created_at?: string }>(a: T, b: T) =>
  a.position - b.position || String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));

function LessonFields({ l }: { l?: Lesson }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_110px]">
        <div>
          <label className="label">Título de la clase</label>
          <input name="title" defaultValue={l?.title} className="input" required />
        </div>
        <div>
          <label className="label">Minutos</label>
          <input name="duration_min" type="number" min={0} defaultValue={l?.duration_min ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Orden</label>
          <input name="position" type="number" defaultValue={l?.position ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Link del video (Vimeo o Bunny.net)</label>
        <input name="video_url" defaultValue={l?.video_url ?? ""} className="input" placeholder="https://vimeo.com/123456789" />
      </div>
      <div>
        <label className="label">Descripción</label>
        <textarea name="description" defaultValue={l?.description ?? ""} className="input min-h-24" />
      </div>
      <div>
        <label className="label">Recursos — uno por línea: Nombre | link</label>
        <textarea name="resources" defaultValue={l?.resources ?? ""} className="input min-h-20 font-mono text-xs" placeholder={"Plantilla de costeo | https://docs.google.com/...\nPresentación | https://..."} />
      </div>
    </>
  );
}

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
            <label className="label">Portada (link de imagen 16:9)</label>
            <input name="cover_url" defaultValue={course.cover_url ?? ""} className="input" placeholder="https://…" />
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
                <details key={l.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <span className="w-6 text-center font-display text-muted">{l.position}</span>
                    <span className="flex-1 text-[15px]">{l.title}</span>
                    {!toEmbedUrl(l.video_url) && <span className="chip border border-brand/40 text-brand">Sin video</span>}
                    <span className="text-muted transition group-open:rotate-90">›</span>
                  </summary>
                  <div className="space-y-4 bg-bg/60 p-5">
                    <ActionForm action={saveLesson} submitLabel="Guardar clase" buttonClassName="btn-primary h-10">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="course_id" value={course.id} />
                      <LessonFields l={l} />
                    </ActionForm>
                    <form action={deleteLesson}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="course_id" value={course.id} />
                      <ConfirmButton message={`¿Eliminar la clase "${l.title}"?`} className="text-xs text-muted hover:text-red-400">Eliminar clase</ConfirmButton>
                    </form>
                  </div>
                </details>
              ))}
              <details className="group">
                <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-brand hover:bg-surface-2">+ Agregar clase</summary>
                <div className="bg-bg/60 p-5">
                  <ActionForm action={addLesson} submitLabel="Agregar clase" buttonClassName="btn-primary h-10" resetOnSuccess>
                    <input type="hidden" name="module_id" value={m.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <LessonFields />
                  </ActionForm>
                </div>
              </details>
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
