import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { EmptyState } from "@/components/ui";

export default async function ChatIndex() {
  const { supabase } = await requireActive();
  const { data } = await supabase.from("chat_channels").select("id").order("position").order("created_at").limit(1);
  if (data?.[0]) redirect(`/chat/${data[0].id}`);
  return <EmptyState title="Aún no hay canales" text="El equipo todavía no ha abierto ningún canal de chat." />;
}
