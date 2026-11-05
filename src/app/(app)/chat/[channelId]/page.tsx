import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { createChannel, deleteChannel } from "@/app/actions/chat";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { ChatRoom, type ChatMessage } from "@/components/chat-room";
import type { Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Chat" };

type Channel = { id: string; name: string; plan_id: string | null };

export default async function ChatPage({ params }: PageProps<"/chat/[channelId]">) {
  const { supabase, user, profile } = await requireActive();
  const { channelId } = await params;
  const isAdmin = profile.role === "admin";

  const [{ data: channels }, { data: msgs }, { data: plans }] = await Promise.all([
    supabase.from("chat_channels").select("id, name, plan_id").order("position").order("created_at"),
    supabase
      .from("chat_messages")
      .select("id, channel_id, author_id, body, created_at, author:profiles!chat_messages_author_id_fkey(full_name, avatar_url, role)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(100),
    isAdmin ? supabase.from("plans").select("id, name").order("name") : Promise.resolve({ data: [] }),
  ]);

  const list = (channels ?? []) as Channel[];
  const current = list.find((c) => c.id === channelId);
  if (!current) notFound();
  const planName = (id: string | null) => ((plans ?? []) as Plan[]).find((p) => p.id === id)?.name;

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      {/* Canales */}
      <aside className="card h-fit p-3">
        <p className="eyebrow mb-3 px-2 pt-2">Canales</p>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
                c.id === channelId ? "bg-brand-soft text-brand shadow-[inset_2px_0_0_var(--brand)]" : "text-ink/75 hover:bg-surface-2"
              }`}
            >
              # {c.name}
              {isAdmin && c.plan_id && <span className="ml-1 text-[10px] text-muted">({planName(c.plan_id)})</span>}
            </Link>
          ))}
        </nav>
        {isAdmin && (
          <details className="mt-3 border-t border-line pt-3">
            <summary className="cursor-pointer list-none px-2 text-xs font-semibold text-brand">+ Nuevo canal</summary>
            <ActionForm action={createChannel} submitLabel="Crear canal" className="mt-3 space-y-2 px-1" buttonClassName="btn-primary h-9 w-full text-xs">
              <input name="name" className="input py-2 text-sm" placeholder="Ej: dudas-meta" required />
              <select name="plan_id" className="input py-2 text-sm" defaultValue="">
                <option value="">Todos los alumnos</option>
                {((plans ?? []) as Plan[]).map((p) => (
                  <option key={p.id} value={p.id}>Solo plan {p.name}</option>
                ))}
              </select>
            </ActionForm>
          </details>
        )}
      </aside>

      {/* Conversación */}
      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="display text-3xl"># {current.name}</h1>
          {isAdmin && list.length > 1 && (
            <form action={deleteChannel}>
              <input type="hidden" name="id" value={current.id} />
              <ConfirmButton message={`¿Eliminar el canal #${current.name} y todos sus mensajes?`} className="text-xs text-muted hover:text-red-400">
                Eliminar canal
              </ConfirmButton>
            </form>
          )}
        </div>
        <ChatRoom
          key={current.id}
          channelId={current.id}
          me={{ id: user.id, full_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role }}
          isAdmin={isAdmin}
          initial={((msgs ?? []) as unknown as ChatMessage[]).reverse()}
        />
      </section>
    </div>
  );
}
