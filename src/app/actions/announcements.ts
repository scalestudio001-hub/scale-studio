"use server";

import { revalidatePath } from "next/cache";
import { requireActive, requireAdmin } from "@/lib/auth";
import { str } from "@/lib/utils";
import { announcementEmail, sendEmail } from "@/lib/email";
import type { AdminUser } from "@/lib/types";

type S = { error?: string; ok?: string } | undefined;

export async function createAnnouncement(_: S, fd: FormData): Promise<S> {
  const { supabase, user, profile } = await requireAdmin();
  const title = str(fd, "title");
  const body = str(fd, "body");
  let link = str(fd, "link_url");
  if (!title) return { error: "Ponle un título al anuncio." };
  if (link && !/^https?:\/\//.test(link) && !link.startsWith("/")) link = `https://${link}`;
  const priority = str(fd, "priority") === "importante" ? "importante" : "normal";

  const { data, error } = await supabase
    .from("announcements")
    .insert({ title, body, link_url: link || null, priority, author_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  let sent = 0;
  if (fd.get("email") === "on") {
    const { data: users } = await supabase.rpc("admin_list_users");
    const emails = ((users ?? []) as AdminUser[]).filter((u) => u.status === "active" && u.email && u.id !== user.id).map((u) => u.email);
    const mail = announcementEmail(profile.full_name, title, body, "");
    mail.html = mail.html.replace(/\/comunidad\/"/g, `/cursos"`);
    for (let i = 0; i < emails.length; i += 50) {
      if (await sendEmail({ bcc: emails.slice(i, i + 50), ...mail })) sent += emails.slice(i, i + 50).length;
    }
  }

  revalidatePath("/", "layout");
  return { ok: sent ? `Anuncio publicado y enviado a ${sent} correos 🔔` : `Anuncio publicado 🔔 (id ${data.id.slice(0, 6)})` };
}

export async function deleteAnnouncement(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("announcements").delete().eq("id", str(fd, "id"));
  revalidatePath("/", "layout");
}

/** Marca anuncios como leídos para el usuario actual. */
export async function markAnnouncementsRead(ids: string[]) {
  const { supabase, user } = await requireActive();
  const clean = ids.filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 100);
  if (!clean.length) return;
  await supabase
    .from("announcement_reads")
    .upsert(clean.map((announcement_id) => ({ announcement_id, user_id: user.id })), { ignoreDuplicates: true });
}
