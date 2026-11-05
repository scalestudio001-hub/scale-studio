import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { Avatar } from "@/components/ui";
import { DmRoom, type DmMessage } from "@/components/dm-room";

export default async function ThreadPage({ params }: PageProps<"/mensajes/[threadId]">) {
  const { supabase, user } = await requireActive();
  const { threadId } = await params;
  const { data: t } = await supabase
    .from("dm_threads")
    .select("id, user_a, user_b, a:profiles!dm_threads_user_a_fkey(id, full_name, avatar_url, headline), b:profiles!dm_threads_user_b_fkey(id, full_name, avatar_url, headline)")
    .eq("id", threadId)
    .maybeSingle();
  if (!t) notFound();
  type P = { id: string; full_name: string; avatar_url: string | null; headline: string | null } | null;
  const other = (t.user_a === user.id ? t.b : t.a) as unknown as P;

  const [{ data: msgs }] = await Promise.all([
    supabase.from("dm_messages").select("id, thread_id, sender_id, body, read_at, created_at").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(200),
    supabase.from("dm_messages").update({ read_at: new Date().toISOString() }).eq("thread_id", threadId).neq("sender_id", user.id).is("read_at", null),
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).eq("link", `/mensajes/${threadId}`).is("read_at", null),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/mensajes" className="text-sm font-medium text-muted hover:text-brand">← Mensajes</Link>
      <div className="mb-3 mt-3 flex items-center gap-3">
        <Link href={`/miembros/${other?.id}`}><Avatar name={other?.full_name || "Miembro"} url={other?.avatar_url} size={44} /></Link>
        <div>
          <Link href={`/miembros/${other?.id}`} className="display text-2xl hover:text-brand">{other?.full_name}</Link>
          {other?.headline && <p className="font-serif text-sm italic text-brand">{other.headline}</p>}
        </div>
      </div>
      <DmRoom threadId={threadId} meId={user.id} otherName={other?.full_name ?? ""} initial={((msgs ?? []) as DmMessage[]).reverse()} />
    </div>
  );
}
