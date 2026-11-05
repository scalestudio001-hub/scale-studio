"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { cleanHtml } from "@/lib/sanitize";
import { str } from "@/lib/utils";
import type { LessonFile } from "@/lib/types";

export type LessonPayload = {
  id: string;
  courseId: string;
  title: string;
  durationMin: number | null;
  published: boolean;
  videoUrl: string;
  videoPath: string | null;
  html: string;
  files: LessonFile[];
};

export async function saveLessonFull(p: LessonPayload): Promise<{ error?: string; ok?: string }> {
  const { supabase } = await requireAdmin();
  if (!p.title.trim()) return { error: "La clase necesita un título." };
  const files = (p.files ?? [])
    .filter((f) => f.path?.startsWith(`${p.courseId}/`))
    .slice(0, 30)
    .map((f) => ({ name: String(f.name).slice(0, 200), path: f.path, size: Number(f.size) || 0, type: String(f.type).slice(0, 100) }));
  if (p.videoPath && !p.videoPath.startsWith(`${p.courseId}/`)) return { error: "Video no válido" };

  const { data: prev } = await supabase.from("lessons").select("video_path, files").eq("id", p.id).maybeSingle();
  const { error } = await supabase
    .from("lessons")
    .update({
      title: p.title.trim().slice(0, 200),
      duration_min: p.durationMin && p.durationMin > 0 ? Math.round(p.durationMin) : null,
      published: !!p.published,
      video_url: p.videoPath ? null : p.videoUrl.trim() || null,
      video_path: p.videoPath || null,
      content_html: cleanHtml(p.html || ""),
      files,
    })
    .eq("id", p.id);
  if (error) return { error: error.message };

  // borrar archivos que se quitaron
  const keep = new Set([p.videoPath, ...files.map((f) => f.path)].filter(Boolean));
  const old = [prev?.video_path, ...((prev?.files as LessonFile[] | null) ?? []).map((f) => f.path)].filter((x): x is string => !!x && !keep.has(x));
  if (old.length) await supabase.storage.from("lessons").remove(old);

  revalidatePath(`/admin/cursos/${p.courseId}`);
  revalidatePath(`/cursos/${p.courseId}`, "layout");
  return { ok: "Clase guardada ✅" };
}

export async function createLessonDraft(fd: FormData) {
  const { supabase } = await requireAdmin();
  const moduleId = str(fd, "module_id");
  const courseId = str(fd, "course_id");
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data, error } = await supabase
    .from("lessons")
    .insert({ module_id: moduleId, title: str(fd, "title") || "Nueva clase", position: (count ?? 0) + 1, published: false })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/admin/cursos/${courseId}/clase/${data.id}`);
}
