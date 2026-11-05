"use server";

import { revalidatePath } from "next/cache";
import { requireActive } from "@/lib/auth";

export async function toggleLesson(fd: FormData) {
  const { supabase, user } = await requireActive();
  const lessonId = String(fd.get("lessonId"));
  const courseId = String(fd.get("courseId"));
  const done = fd.get("done") === "1";

  if (done) {
    await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  } else {
    await supabase.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lessonId }, { ignoreDuplicates: true });
  }
  revalidatePath(`/cursos/${courseId}`, "layout");
  revalidatePath("/cursos");
}
