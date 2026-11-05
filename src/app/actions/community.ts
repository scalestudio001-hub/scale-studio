"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { COMMUNITY_CATEGORIES, str } from "@/lib/utils";

type S = { error?: string; ok?: string } | undefined;

export async function createPost(_: S, fd: FormData): Promise<S> {
  const { supabase, user, profile } = await requireActive();
  const title = str(fd, "title");
  const body = str(fd, "body");
  let category = str(fd, "category");
  if (!(COMMUNITY_CATEGORIES as readonly string[]).includes(category)) category = "General";
  if (category === "Anuncios" && profile.role !== "admin") category = "General";
  if (!title || !body) return { error: "Escribe un título y el contenido." };

  const { error } = await supabase.from("posts").insert({ author_id: user.id, title, body, category });
  if (error) return { error: "No se pudo publicar: " + error.message };
  revalidatePath("/comunidad");
  return { ok: "¡Publicado!" };
}

export async function deletePost(fd: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("posts").delete().eq("id", String(fd.get("postId")));
  revalidatePath("/comunidad");
  redirect("/comunidad");
}

export async function togglePin(fd: FormData) {
  const { supabase } = await requireActive();
  const id = String(fd.get("postId"));
  await supabase.from("posts").update({ pinned: fd.get("pinned") !== "1" }).eq("id", id);
  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${id}`);
}

export async function toggleLike(fd: FormData) {
  const { supabase, user } = await requireActive();
  const postId = String(fd.get("postId"));
  if (fd.get("liked") === "1") {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
  }
  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${postId}`);
}

export async function addComment(_: S, fd: FormData): Promise<S> {
  const { supabase, user } = await requireActive();
  const postId = str(fd, "postId");
  const body = str(fd, "body");
  if (!body) return { error: "Escribe tu comentario." };
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body });
  if (error) return { error: "No se pudo comentar: " + error.message };
  revalidatePath(`/comunidad/${postId}`);
  revalidatePath("/comunidad");
  return { ok: "Comentario publicado" };
}

export async function deleteComment(fd: FormData) {
  const { supabase } = await requireActive();
  const postId = String(fd.get("postId"));
  await supabase.from("comments").delete().eq("id", String(fd.get("commentId")));
  revalidatePath(`/comunidad/${postId}`);
}
