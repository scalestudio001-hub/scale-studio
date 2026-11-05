"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar, RichText } from "@/components/ui";
import type { Author } from "@/lib/types";

export type ChatMessage = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Author | null;
};

type Me = Author & { id: string };

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

function dia(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

export function ChatRoom({
  channelId,
  me,
  isAdmin,
  initial,
}: {
  channelId: string;
  me: Me;
  isAdmin: boolean;
  initial: ChatMessage[];
}) {
  const supabase = getBrowserClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const authors = useRef(new Map<string, Author>());
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Cache de autores conocidos
  useEffect(() => {
    authors.current.set(me.id, { full_name: me.full_name, avatar_url: me.avatar_url, role: me.role });
    initial.forEach((m) => m.author && authors.current.set(m.author_id, m.author));
  }, [initial, me]);

  const addMessage = useCallback(
    async (row: Omit<ChatMessage, "author">) => {
      let author = authors.current.get(row.author_id) ?? null;
      if (!author) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, role")
          .eq("id", row.author_id)
          .maybeSingle();
        if (data) {
          author = data as Author;
          authors.current.set(row.author_id, author);
        }
      }
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row, author }]));
    },
    [supabase],
  );

  // Tiempo real
  useEffect(() => {
    const ch = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        (payload: { new: Omit<ChatMessage, "author"> }) => addMessage(payload.new),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        (payload: { old: { id: string } }) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id)),
      )
      .subscribe((status: string) => setOnline(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId, supabase, addMessage]);

  // Auto-scroll si estás abajo
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ channel_id: channelId, author_id: me.id, body })
      .select("id, channel_id, author_id, body, created_at")
      .single();
    setSending(false);
    if (error) {
      setError("No se pudo enviar el mensaje. Intenta de nuevo.");
      return;
    }
    setText("");
    stick.current = true;
    addMessage(data as Omit<ChatMessage, "author">);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este mensaje?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (!error) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="card flex h-[calc(100svh-13rem)] min-h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-muted/50"}`} />
        {online ? "En vivo" : "Conectando…"}
      </div>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 sm:px-5"
      >
        {messages.length === 0 && (
          <div className="grid h-full place-items-center text-center text-muted">
            <div>
              <p className="display text-2xl text-ink">Empieza la conversación 👋</p>
              <p className="mt-1 text-sm">Sé el primero en escribir en este canal.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || dia(prev.created_at) !== dia(m.created_at);
          const grouped =
            !newDay &&
            prev &&
            prev.author_id === m.author_id &&
            new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
          const name = m.author?.full_name || "Alumno";
          const mine = m.author_id === me.id;
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  <span className="h-px flex-1 bg-line" />
                  {dia(m.created_at)}
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <div className={`group relative flex gap-3 rounded-md px-2 py-1 transition hover:bg-surface-2/70 ${grouped ? "" : "mt-3"}`}>
                <div className="w-9 shrink-0">
                  {!grouped && <Avatar name={name} url={m.author?.avatar_url} size={36} />}
                </div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <p className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className={`font-semibold ${mine ? "text-brand" : ""}`}>{name}</span>
                      {m.author?.role === "admin" && <span className="chip bg-brand py-0 text-[9px] text-on-brand">Equipo</span>}
                      <span className="text-[11px] text-muted">{hora(m.created_at)}</span>
                    </p>
                  )}
                  <RichText text={m.body} className="text-[15px] text-ink/90" />
                </div>
                {(mine || isAdmin) && (
                  <button
                    onClick={() => remove(m.id)}
                    className="absolute right-2 top-1 hidden rounded px-1.5 text-xs text-muted hover:text-red-400 group-hover:block"
                    aria-label="Eliminar mensaje"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-line p-3"
      >
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Escribe un mensaje…  (Enter para enviar, Shift+Enter para salto de línea)"
            className="input max-h-40 min-h-12 flex-1 resize-none py-3"
          />
          <button type="submit" disabled={sending || !text.trim()} className="btn-primary h-12 px-5">
            {sending ? "…" : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
