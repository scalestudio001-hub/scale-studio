"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { RichText } from "@/components/ui";

export type DmMessage = { id: string; thread_id: string; sender_id: string; body: string; read_at: string | null; created_at: string };

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

export function DmRoom({ threadId, meId, otherName, initial }: { threadId: string; meId: string; otherName: string; initial: DmMessage[] }) {
  const supabase = getBrowserClient();
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ch = supabase
      .channel(`dm:${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` }, (p: { new: DmMessage }) => {
        const m = p.new;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== meId) {
          supabase.from("dm_messages").update({ read_at: new Date().toISOString() }).eq("id", m.id).then(() => {});
          supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", meId).eq("link", `/mensajes/${threadId}`).is("read_at", null).then(() => {});
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` }, (p: { new: DmMessage }) =>
        setMsgs((prev) => prev.map((x) => (x.id === p.new.id ? p.new : x))),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, threadId, meId]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const { data, error } = await supabase.from("dm_messages").insert({ thread_id: threadId, sender_id: meId, body }).select().single();
    setSending(false);
    if (error) return setError("No se pudo enviar. Intenta de nuevo.");
    setText("");
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as DmMessage]));
  }

  const lastMine = [...msgs].reverse().find((m) => m.sender_id === meId);

  return (
    <div className="card flex h-[calc(100svh-15rem)] min-h-[420px] flex-col overflow-hidden">
      <div ref={scroller} className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
        {msgs.length === 0 && <p className="grid h-full place-items-center text-center text-sm text-muted">Escríbele a {otherName.split(" ")[0]} 👋</p>}
        {msgs.map((m, i) => {
          const mine = m.sender_id === meId;
          const newDay = i === 0 || dia(msgs[i - 1].created_at) !== dia(m.created_at);
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{dia(m.created_at)}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm bg-surface-2"}`}>
                  <RichText text={m.body} className="text-[15px]" />
                  <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-on-brand/70" : "text-muted"}`}>
                    {hora(m.created_at)}
                    {mine && m.id === lastMine?.id && (m.read_at ? " · Visto ✓✓" : " · Enviado ✓")}
                  </p>
                </div>
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
            maxLength={3000}
            placeholder="Escribe un mensaje…"
            className="input max-h-40 min-h-12 flex-1 resize-none py-3"
          />
          <button disabled={sending || !text.trim()} className="btn-primary h-12 px-5">{sending ? "…" : "Enviar"}</button>
        </div>
      </form>
    </div>
  );
}
