import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createPlan, deletePlan, savePlan } from "@/app/actions/admin";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import type { Course, Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Planes" };

export default async function PlansPage() {
  const { supabase } = await requireAdmin();
  const [{ data: plans }, { data: courses }, { data: links }, { data: profiles }] = await Promise.all([
    supabase.from("plans").select("*").order("created_at"),
    supabase.from("courses").select("*").order("position").order("created_at"),
    supabase.from("plan_courses").select("*"),
    supabase.from("profiles").select("plan_id"),
  ]);
  const courseList = (courses ?? []) as Course[];
  const pairs = (links ?? []) as { plan_id: string; course_id: string }[];
  const members = (id: string) => (profiles ?? []).filter((p) => p.plan_id === id).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {((plans ?? []) as Plan[]).map((p) => (
          <div key={p.id} className="card p-5">
            <form action={savePlan} className="space-y-4">
              <input type="hidden" name="id" value={p.id} />
              <div className="flex items-start justify-between gap-3">
                <input name="name" defaultValue={p.name} className="input font-display text-xl uppercase" />
                <span className="chip mt-3 shrink-0 border border-line text-muted">{members(p.id)} alumnos</span>
              </div>
              <input name="description" defaultValue={p.description ?? ""} className="input" placeholder="Descripción (opcional)" />
              <div>
                <p className="label">Cursos incluidos</p>
                {courseList.length === 0 && <p className="text-sm text-muted">Aún no hay cursos creados.</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {courseList.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                      <input type="checkbox" name="courses" value={c.id} defaultChecked={pairs.some((x) => x.plan_id === p.id && x.course_id === c.id)} className="accent-[var(--brand)]" />
                      {c.title}
                      {!c.published && <span className="chip ml-auto text-muted">Borrador</span>}
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton className="btn-primary h-10">Guardar plan</SubmitButton>
            </form>
            <form action={deletePlan} className="mt-3">
              <input type="hidden" name="id" value={p.id} />
              <ConfirmButton message={`¿Eliminar el plan "${p.name}"? Los alumnos quedarán sin plan.`} className="text-xs text-muted hover:text-red-400">Eliminar plan</ConfirmButton>
            </form>
          </div>
        ))}
        {(plans ?? []).length === 0 && <p className="card p-8 text-center text-muted">Crea tu primer plan →</p>}
      </div>
      <div className="card h-fit p-5">
        <p className="eyebrow mb-4">Nuevo plan</p>
        <ActionForm action={createPlan} submitLabel="Crear plan" resetOnSuccess>
          <input name="name" className="input" placeholder="Ej: Despegue" required />
          <input name="description" className="input" placeholder="Descripción (opcional)" />
        </ActionForm>
      </div>
    </div>
  );
}
