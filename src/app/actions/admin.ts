"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive, requireAdmin } from "@/lib/auth";
import { str } from "@/lib/utils";
import { approvalEmail, blockedEmail, sendEmail } from "@/lib/email";
import type { AdminUser } from "@/lib/types";

type S = { error?: string; ok?: string } | undefined;
const num = (v: string) => (v === "" || isNaN(Number(v)) ? 0 : Number(v));

// ---------- Perfil (cualquier usuario) ----------
export async function updateProfile(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireActive();
  const full_name = str(fd, "full_name");
  const avatar_url = str(fd, "avatar_url") || null;
  if (!full_name) return { error: "Escribe tu nombre." };
  if (avatar_url && !/^https:\/\//.test(avatar_url)) return { error: "La foto debe ser un link https://" };
  const { error } = await supabase.from("profiles").update({ full_name, avatar_url }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Perfil actualizado ✅" };
}

// ---------- Usuarios ----------
export async function updateUser(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const newStatus = str(fd, "status");
  const planId = str(fd, "plan_id") || null;

  const { data: users } = await supabase.rpc("admin_list_users");
  const before = ((users ?? []) as AdminUser[]).find((u) => u.id === id);

  const { error } = await supabase.rpc("admin_update_user", {
    uid: id,
    new_status: newStatus,
    new_plan: planId,
    new_role: str(fd, "role"),
  });
  if (error) throw new Error(error.message);

  // Correo de aprobación cuando pasa a activo
  if (before && before.status !== "active" && newStatus === "active" && before.email) {
    let planName: string | null = null;
    if (planId) {
      const { data: plan } = await supabase.from("plans").select("name").eq("id", planId).maybeSingle();
      planName = plan?.name ?? null;
    }
    await sendEmail({ to: before.email, ...approvalEmail(before.full_name, planName) });
  }
  // Correo de cuenta pausada cuando se bloquea
  if (before && before.status !== "blocked" && newStatus === "blocked" && before.email) {
    await sendEmail({ to: before.email, ...blockedEmail(before.full_name) });
  }
  revalidatePath("/admin");
}

// ---------- Planes ----------
export async function createPlan(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const name = str(fd, "name");
  if (!name) return { error: "Ponle nombre al plan." };
  const { error } = await supabase.from("plans").insert({ name, description: str(fd, "description") || null });
  if (error) return { error: error.message };
  revalidatePath("/admin/planes");
  return { ok: "Plan creado" };
}

export async function savePlan(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  await supabase.from("plans").update({ name: str(fd, "name"), description: str(fd, "description") || null }).eq("id", id);
  const courseIds = fd.getAll("courses").map(String);
  await supabase.from("plan_courses").delete().eq("plan_id", id);
  if (courseIds.length)
    await supabase.from("plan_courses").insert(courseIds.map((course_id) => ({ plan_id: id, course_id })));
  revalidatePath("/admin/planes");
  revalidatePath("/cursos");
}

export async function deletePlan(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("plans").delete().eq("id", str(fd, "id"));
  revalidatePath("/admin/planes");
}

// ---------- Cursos ----------
export async function createCourse(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const title = str(fd, "title");
  if (!title) return { error: "Ponle título al curso." };
  const { data, error } = await supabase.from("courses").insert({ title }).select("id").single();
  if (error) return { error: error.message };
  redirect(`/admin/cursos/${data.id}`);
}

export async function saveCourse(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const { error } = await supabase
    .from("courses")
    .update({
      title: str(fd, "title"),
      description: str(fd, "description") || null,
      cover_url: str(fd, "cover_url") || null,
      position: num(str(fd, "position")),
      published: fd.get("published") === "on",
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/cursos/${id}`);
  revalidatePath("/admin/cursos");
  revalidatePath("/cursos", "layout");
  return { ok: "Curso guardado ✅" };
}

export async function deleteCourse(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("courses").delete().eq("id", str(fd, "id"));
  revalidatePath("/admin/cursos");
  redirect("/admin/cursos");
}

// ---------- Módulos ----------
export async function addModule(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const course_id = str(fd, "course_id");
  const title = str(fd, "title");
  if (!title) return { error: "Ponle título al módulo." };
  const { count } = await supabase.from("modules").select("id", { count: "exact", head: true }).eq("course_id", course_id);
  const { error } = await supabase.from("modules").insert({ course_id, title, position: (count ?? 0) + 1 });
  if (error) return { error: error.message };
  revalidatePath(`/admin/cursos/${course_id}`);
  return { ok: "Módulo agregado" };
}

export async function saveModule(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("modules")
    .update({ title: str(fd, "title"), position: num(str(fd, "position")) })
    .eq("id", str(fd, "id"));
  revalidatePath(`/admin/cursos/${str(fd, "course_id")}`);
}

export async function deleteModule(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("modules").delete().eq("id", str(fd, "id"));
  revalidatePath(`/admin/cursos/${str(fd, "course_id")}`);
}

// ---------- Lecciones ----------
function lessonFields(fd: FormData) {
  const d = str(fd, "duration_min");
  return {
    title: str(fd, "title"),
    video_url: str(fd, "video_url") || null,
    description: str(fd, "description") || null,
    resources: str(fd, "resources") || null,
    duration_min: d ? num(d) : null,
    position: num(str(fd, "position")),
  };
}

export async function addLesson(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const module_id = str(fd, "module_id");
  const fields = lessonFields(fd);
  if (!fields.title) return { error: "Ponle título a la clase." };
  if (!fields.position) {
    const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", module_id);
    fields.position = (count ?? 0) + 1;
  }
  const { error } = await supabase.from("lessons").insert({ module_id, ...fields });
  if (error) return { error: error.message };
  revalidatePath(`/admin/cursos/${str(fd, "course_id")}`);
  return { ok: "Clase agregada ✅" };
}

export async function saveLesson(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const fields = lessonFields(fd);
  if (!fields.title) return { error: "La clase necesita título." };
  const { error } = await supabase.from("lessons").update(fields).eq("id", str(fd, "id"));
  if (error) return { error: error.message };
  revalidatePath(`/admin/cursos/${str(fd, "course_id")}`);
  revalidatePath("/cursos", "layout");
  return { ok: "Clase guardada ✅" };
}

export async function deleteLesson(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lessons").delete().eq("id", str(fd, "id"));
  revalidatePath(`/admin/cursos/${str(fd, "course_id")}`);
}
