"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { str } from "@/lib/utils";

type S = { error?: string; ok?: string } | undefined;

export async function createChannel(_: S, fd: FormData): Promise<S> {
  const { supabase } = await requireAdmin();
  const name = str(fd, "name");
  if (!name) return { error: "Ponle nombre al canal." };
  const { data, error } = await supabase
    .from("chat_channels")
    .insert({ name, plan_id: str(fd, "plan_id") || null, position: 99 })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/chat", "layout");
  redirect(`/chat/${data.id}`);
}

export async function deleteChannel(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("chat_channels").delete().eq("id", str(fd, "id"));
  revalidatePath("/chat", "layout");
  redirect("/chat");
}
