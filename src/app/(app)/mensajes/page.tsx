import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Mensajes" };

type Thread = {
  id: string; user_a: string; user_b: string; last_message_at: string;
  a: { full_name: string; avatar_url: string | null } | null;
  b: { full_name: string; avatar_url: string | null } | null;
  dm_messages: { body: string; sender_id: string; read_at: string | null; created_at: string }[];
};

export default async function InboxPage() {
  const { supabase, user } = await requireActive();
  const { data } = await supabase
    .from("dm_threads")
    .select("id, user_a, user_b, last_message_at, a:profiles!dm_threads_user_a_fkey(full_name, avatar_url), b:profiles!dm_threads_user_b_fkey(full_name, avatar_url), dm_messages(body, sender_id, read_at, created_at)")
    .order("last_message_at", { ascending: false })
    .order("created_at", { referencedTable: "dm_messages", ascending: false })
    .limit(30, { referencedTable: "dm_messages" });
  const threads = ((data ?? []) as unknown as Thread[]).filter((t) => t.dm_messages.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Privado" title="Mensajes" subtitle="Conversaciones uno a uno con otros miembros y el equipo." actions={<Link href="/miembros" className="btn-primary h-10">✉️ Nuevo mensaje</Link>} />
      {threads.length === 0 ? (
        <EmptyState title="Aún no tienes mensajes" text="Entra al perfil de un miembro y presiona “Enviar mensaje”.">
          <Link href="/miembros" className="btn-ghost">Ver miembros</Link>
        </EmptyState>
      ) : (
        <div className="card divide-y divide-line">
          {threads.map((t) => {
            const other = t.user_a === user.id ? t.b : t.a;
            const last = t.dm_messages[0];
            const unread = t.dm_messages.filter((m) => m.sender_id !== user.id && !m.read_at).length;
            return (
              <Link key={t.id} href={`/mensajes/${t.id}`} className={`flex items-center gap-3 px-5 py-4 transition hover:bg-surface-2 ${unread ? "bg-brand-soft/40" : ""}`}>
                <Avatar name={other?.full_name || "Miembro"} url={other?.avatar_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{other?.full_name}</p>
                  <p className={`truncate text-sm ${unread ? "text-ink" : "text-muted"}`}>
                    {last.sender_id === user.id ? "Tú: " : ""}{last.body}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted">{timeAgo(last.created_at)}</p>
                  {unread > 0 && <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-on-brand">{unread}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
