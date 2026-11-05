"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { COMMUNITY_CATEGORIES, str } from "@/lib/utils";
import { announcementEmail, sendEmail } from "@/lib/email";
import type { AdminUser } from "@/lib/types";

type S = { error?: string; ok?: string } | undefined;

function cleanCategory(raw: string, isAdmin: boolean) {
  let c = (COMMUNITY_CATEGORIES as readonly string[]).includes(raw) ? raw : "General";
  if (c === "Anuncios" && !isAdmin) c = "General";
  return c;
}

function cleanUrl(raw: string) {
  if (!raw) return null;
  const u = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(u).toString();
  } catch {
    return null;
  }
}

export async function createPost(_: S, fd: FormData): Promise<S> {
  const { supabase, user, profile } = await requireActive();
  const title = str(fd, "title");
  const body = str(fd, "body");
  if (!title) return { error: "Escribe un título." };
  if (!body && !str(fd, "attachment_path") && !str(fd, "link_url")) return { error: "Escribe algo o agrega un archivo o link." };

  const attachment_path = str(fd, "attachment_path") || null;
  if (attachment_path && !attachment_path.startsWith(`${user.id}/`)) return { error: "Archivo no válido." };
  const attachment_type = attachment_path ? (str(fd, "attachment_type") === "video" ? "video" : "image") : null;

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      title,
      body,
      category: cleanCategory(str(fd, "category"), profile.role === "admin"),
      attachment_path,
      attachment_type,
      link_url: cleanUrl(str(fd, "link_url")),
    })
    .select("id")
    .single();
  if (error) return { error: "No se pudo publicar: " + error.message };

  const options = fd
    .getAll("poll")
    .map((o) => String(o).trim())
    .filter(Boolean)
    .slice(0, 10);
  if (options.length >= 2) {
    await supabase.from("poll_options").insert(options.map((label, position) => ({ post_id: post.id, label, position })));
  }

  // Admin: enviar por correo a todos los alumnos activos
  let sent = 0;
  if (profile.role === "admin" && fd.get("notify") === "1") {
    const { data: users } = await supabase.rpc("admin_list_users");
    const emails = ((users ?? []) as AdminUser[])
      .filter((u) => u.status === "active" && u.email && u.id !== user.id)
      .map((u) => u.email);
    const mail = announcementEmail(profile.full_name, title, body, post.id);
    for (let i = 0; i < emails.length; i += 50) {
      if (await sendEmail({ bcc: emails.slice(i, i + 50), ...mail })) sent += emails.slice(i, i + 50).length;
    }
  }

  revalidatePath("/comunidad");
  return { ok: sent ? `¡Publicado y enviado por correo a ${sent} alumnos! 🎉` : "¡Publicado! 🎉" };
}

export async function updatePost(_: S, fd: FormData): Promise<S> {
  const { supabase, profile } = await requireActive();
  const id = str(fd, "postId");
  const title = str(fd, "title");
  if (!title) return { error: "El título no puede quedar vacío." };
  const { error } = await supabase
    .from("posts")
    .update({
      title,
      body: str(fd, "body"),
      category: cleanCategory(str(fd, "category"), profile.role === "admin"),
      link_url: cleanUrl(str(fd, "link_url")),
      edited_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${id}`);
  redirect(`/comunidad/${id}`);
}

export async function deletePost(fd: FormData) {
  const { supabase } = await requireActive();
  const id = String(fd.get("postId"));
  const { data } = await supabase.from("posts").select("attachment_path").eq("id", id).maybeSingle();
  await supabase.from("posts").delete().eq("id", id);
  if (data?.attachment_path) await supabase.storage.from("community").remove([data.attachment_path]);
  revalidatePath("/comunidad");
  if (fd.get("stay") !== "1") redirect("/comunidad");
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

export async function vote(fd: FormData) {
  const { supabase, user } = await requireActive();
  const postId = String(fd.get("postId"));
  const optionId = String(fd.get("optionId"));
  if (fd.get("current") === optionId) {
    await supabase.from("poll_votes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("poll_votes").upsert({ post_id: postId, option_id: optionId, user_id: user.id }, { onConflict: "post_id,user_id" });
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
  revalidatePath("/comunidad");
}
