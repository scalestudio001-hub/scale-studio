import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createCourse } from "@/app/actions/admin";
import { ActionForm } from "@/components/forms";
import type { Course } from "@/lib/types";

export const metadata: Metadata = { title: "Cursos (admin)" };

export default async function AdminCoursesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("courses").select("*, modules(id, lessons(id))").order("position").order("created_at");
  const courses = (data ?? []) as (Course & { modules: { id: string; lessons: { id: string }[] }[] })[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {courses.length === 0 && <p className="card p-8 text-center text-muted">Aún no hay cursos. Crea el primero →</p>}
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/cursos/${c.id}`} className="card card-hover flex items-center gap-4 p-4">
            <span className="w-8 text-center font-display text-lg text-muted">{c.position}</span>
            <div className="flex-1">
              <p className="font-semibold">{c.title}</p>
              <p className="text-xs text-muted">
                {c.modules.length} módulos · {c.modules.reduce((n, m) => n + m.lessons.length, 0)} clases
              </p>
            </div>
            <span className={`chip ${c.published ? "border border-emerald-700/60 text-emerald-400" : "bg-brand text-on-brand"}`}>
              {c.published ? "Publicado" : "Borrador"}
            </span>
          </Link>
        ))}
      </div>
      <div className="card h-fit p-5">
        <p className="eyebrow mb-4">Nuevo curso</p>
        <ActionForm action={createCourse} submitLabel="Crear curso">
          <input name="title" className="input" placeholder="Título del curso" required />
        </ActionForm>
      </div>
    </div>
  );
}
