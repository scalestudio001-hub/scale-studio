import "server-only";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import type { Course, Lesson, Module, ModuleWithLessons } from "@/lib/types";

const byPos = <T extends { position: number; created_at?: string }>(a: T, b: T) =>
  a.position - b.position || String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));

/** IDs de cursos a los que el usuario tiene acceso. */
export const getAccessibleCourseIds = cache(async (): Promise<Set<string> | "all"> => {
  const { supabase, profile } = await getSession();
  if (!profile) return new Set();
  if (profile.role === "admin") return "all";
  if (!profile.plan_id) return new Set();
  const { data } = await supabase.from("plan_courses").select("course_id").eq("plan_id", profile.plan_id);
  return new Set((data ?? []).map((r) => r.course_id as string));
});

/** IDs de lecciones completadas por el usuario. */
export const getCompletedLessonIds = cache(async () => {
  const { supabase, user } = await getSession();
  if (!user) return new Set<string>();
  const { data } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.lesson_id as string));
});

export async function getCatalog() {
  const { supabase } = await getSession();
  const [{ data: courses }, { data: lessons }, access, done] = await Promise.all([
    supabase.from("courses").select("*").order("position").order("created_at"),
    supabase.from("lessons").select("id, modules!inner(course_id)"),
    getAccessibleCourseIds(),
    getCompletedLessonIds(),
  ]);

  const total = new Map<string, number>();
  const completed = new Map<string, number>();
  for (const l of (lessons ?? []) as unknown as { id: string; modules: { course_id: string } }[]) {
    const cid = l.modules.course_id;
    total.set(cid, (total.get(cid) ?? 0) + 1);
    if (done.has(l.id)) completed.set(cid, (completed.get(cid) ?? 0) + 1);
  }

  return ((courses ?? []) as Course[]).map((c) => {
    const t = total.get(c.id) ?? 0;
    const d = completed.get(c.id) ?? 0;
    return {
      ...c,
      hasAccess: access === "all" || access.has(c.id),
      lessonCount: t,
      progress: t ? (d / t) * 100 : 0,
    };
  });
}

/** Curso con módulos y lecciones ordenados (vacío si no hay acceso). */
export const getCourseTree = cache(async (courseId: string) => {
  const { supabase } = await getSession();
  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle<Course>();
  if (!course) return null;

  const { data: modules } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId);

  const tree: ModuleWithLessons[] = ((modules ?? []) as (Module & { lessons: Lesson[] })[])
    .sort(byPos)
    .map((m) => ({ ...m, lessons: [...(m.lessons ?? [])].sort(byPos) }));

  const access = await getAccessibleCourseIds();
  const hasAccess = access === "all" || access.has(course.id);

  return { course, modules: tree, hasAccess, lessons: tree.flatMap((m) => m.lessons) };
});
