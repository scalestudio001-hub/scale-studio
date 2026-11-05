"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar, RichText } from "@/components/ui";
import type { Author } from "@/lib/types";

type Kind = "image" | "video" | "audio";

export type ChatMessage = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  created_at: string;
  attachment_path: string | null;
  attachment_type: Kind | null;
  attachment_name: string | null;
  author: Author | null;
};

type Row = Omit<ChatMessage, "author">;
type Me = Author & { id: string };

const BUCKET = "chat";
const MAX_MB = 50;
const COLS = "id, channel_id, author_id, body, created_at, attachment_path, attachment_type, attachment_name";

const EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "🤔", "😅", "😭", "😮",
  "🙌", "👏", "🙏", "💪", "👍", "👎", "👌", "✌️", "🤝", "👀", "🫶", "❤️",
  "🔥", "🚀", "💯", "✅", "❌", "⭐", "🎉", "🏆", "💰", "💸", "📈", "📦",
  "🛒", "📱", "💡", "⏳", "☕", "🇨🇱",
];

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

function dia(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

const kindOf = (mime: string): Kind | null =>
  mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : null;

const extOf = (file: File) => {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : "";
  if (fromName) return fromName.toLowerCase();
  return (file.type.split("/")[1] || "bin").split(";")[0];
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ChatRoom({
  channelId,
  me,
  isAdmin,
  initial,
  initialUrls = {},
}: {
  channelId: string;
  me: Me;
  isAdmin: boolean;
  initial: ChatMessage[];
  initialUrls?: Record<string, string>;
}) {
  const supabase = getBrowserClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const authors = useRef(new Map<string, Author>());
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const discard = useRef(false);

  // ---------- Links firmados para ver los archivos ----------
  const signPaths = useCallback(
    async (paths: string[]) => {
      const missing = paths.filter((p) => p && !urls[p]);
      if (!missing.length) return;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, 60 * 60 * 6);
      if (!data) return;
      setUrls((prev) => {
        const next = { ...prev };
        data.forEach((d: { path: string | null; signedUrl: string }) => {
          if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
        });
        return next;
      });
    },
    [supabase, urls],
  );

  useEffect(() => {
    authors.current.set(me.id, { full_name: me.full_name, avatar_url: me.avatar_url, role: me.role });
    initial.forEach((m) => m.author && authors.current.set(m.author_id, m.author));
  }, [initial, me]);

  const addMessage = useCallback(
    async (row: Row) => {
      let author = authors.current.get(row.author_id) ?? null;
      if (!author) {
        const { data } = await supabase.from("profiles").select("full_name, avatar_url, role").eq("id", row.author_id).maybeSingle();
        if (data) {
          author = data as Author;
          authors.current.set(row.author_id, author);
        }
      }
      if (row.attachment_path) signPaths([row.attachment_path]);
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row, author }]));
    },
    [supabase, signPaths],
  );

  // ---------- Tiempo real ----------
  useEffect(() => {
    const ch = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        (payload: { new: Row }) => addMessage(payload.new),
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

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, urls]);

  // ---------- Adjuntar archivo ----------
  function pickFile(f: File | null | undefined) {
    if (!f) return;
    if (!kindOf(f.type)) return setError("Solo puedes enviar imágenes, videos o audios.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`El archivo pesa más de ${MAX_MB} MB.`);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  // ---------- Grabar audio ----------
  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
      return setError("Tu navegador no permite grabar audio.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      discard.current = false;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recTimer.current) clearInterval(recTimer.current);
        setRecording(false);
        if (discard.current) return;
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunks.current, { type });
        pickFile(new File([blob], `nota-de-voz.${ext}`, { type: type.split(";")[0] }));
      };
      recorder.current = rec;
      rec.start();
      setRecSecs(0);
      setRecording(true);
      recTimer.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch {
      setError("No se pudo usar el micrófono. Revisa que le diste permiso al navegador.");
    }
  }

  function stopRecording(keep: boolean) {
    discard.current = !keep;
    recorder.current?.stop();
  }

  // ---------- Enviar ----------
  async function send() {
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    setError("");

    let attachment: Pick<Row, "attachment_path" | "attachment_type" | "attachment_name"> = {
      attachment_path: null,
      attachment_type: null,
      attachment_name: null,
    };

    if (file) {
      const path = `${channelId}/${me.id}/${crypto.randomUUID()}.${extOf(file)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setSending(false);
        return setError("No se pudo subir el archivo: " + upErr.message);
      }
      attachment = { attachment_path: path, attachment_type: kindOf(file.type), attachment_name: file.name };
      if (preview) setUrls((u) => ({ ...u, [path]: preview }));
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ channel_id: channelId, author_id: me.id, body, ...attachment })
      .select(COLS)
      .single();
    setSending(false);
    if (error) return setError("No se pudo enviar el mensaje. Intenta de nuevo.");

    setText("");
    setFile(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
    setShowEmojis(false);
    stick.current = true;
    addMessage(data as Row);
  }

  async function remove(m: ChatMessage) {
    if (!confirm("¿Eliminar este mensaje?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", m.id);
    if (error) return;
    if (m.attachment_path) await supabase.storage.from(BUCKET).remove([m.attachment_path]);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  }

  function addEmoji(e: string) {
    const el = textarea.current;
    if (!el) return setText((t) => t + e);
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + e + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + e.length, start + e.length);
    });
  }

  const fileKind = file ? kindOf(file.type) : null;

  return (
    <div
      className="card relative flex h-[calc(100svh-13rem)] min-h-[460px] flex-col overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pickFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted">
        <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-muted/50"}`} />
        {online ? "En vivo" : "Conectando…"}
      </div>

      {/* Mensajes */}
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
              <p className="mt-1 text-sm">Escribe, manda una foto, un video o una nota de voz.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || dia(prev.created_at) !== dia(m.created_at);
          const grouped =
            !newDay && prev && prev.author_id === m.author_id &&
            new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
          const name = m.author?.full_name || "Alumno";
          const mine = m.author_id === me.id;
          const url = m.attachment_path ? urls[m.attachment_path] : undefined;
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
                <div className="w-9 shrink-0">{!grouped && <Link href={`/miembros/${m.author_id}`}><Avatar name={name} url={m.author?.avatar_url} size={36} /></Link>}</div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <p className="flex flex-wrap items-baseline gap-2 text-sm">
                      <Link href={`/miembros/${m.author_id}`} className={`font-semibold hover:underline ${mine ? "text-brand" : ""}`}>{name}</Link>
                      {m.author?.role === "admin" && <span className="chip bg-brand py-0 text-[9px] text-on-brand">Equipo</span>}
                      <span className="text-[11px] text-muted">{hora(m.created_at)}</span>
                    </p>
                  )}
                  {m.attachment_path && (
                    <div className="my-1.5">
                      {!url ? (
                        <div className="grid h-40 w-64 max-w-full animate-pulse place-items-center rounded-md border border-line bg-surface-2 text-xs text-muted">
                          Cargando…
                        </div>
                      ) : m.attachment_type === "image" ? (
                        <button onClick={() => setLightbox(url)} className="block overflow-hidden rounded-md border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={m.attachment_name ?? "imagen"} className="max-h-80 max-w-full object-contain transition hover:opacity-90 sm:max-w-sm" />
                        </button>
                      ) : m.attachment_type === "video" ? (
                        <video src={url} controls playsInline preload="metadata" className="max-h-80 max-w-full rounded-md border border-line bg-black sm:max-w-md" />
                      ) : (
                        <audio src={url} controls preload="metadata" className="w-72 max-w-full" />
                      )}
                    </div>
                  )}
                  {m.body && <RichText text={m.body} className="text-[15px] text-ink/90" />}
                </div>
                {(mine || isAdmin) && (
                  <button
                    onClick={() => remove(m)}
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

      {/* Emojis */}
      {showEmojis && (
        <div className="anim-fade-up absolute bottom-[84px] left-3 z-20 w-[min(340px,calc(100%-1.5rem))] rounded-md border border-line bg-surface p-3 shadow-2xl shadow-black/60 [animation-duration:.25s]">
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => addEmoji(e)} className="rounded p-1 text-xl transition hover:scale-125 hover:bg-surface-2">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra para escribir */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-line p-3"
      >
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

        {file && preview && (
          <div className="mb-2 flex items-center gap-3 rounded-md border border-brand/40 bg-brand-soft p-2">
            {fileKind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-14 w-14 rounded object-cover" />
            ) : fileKind === "video" ? (
              <video src={preview} className="h-14 w-20 rounded bg-black object-cover" muted />
            ) : (
              <audio src={preview} controls className="h-9 w-56 max-w-full" />
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-ink/80">
              {fileKind === "audio" ? "🎤 Nota de voz lista" : file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button type="button" onClick={clearFile} className="px-2 text-sm text-muted hover:text-red-400" aria-label="Quitar archivo">
              ✕
            </button>
          </div>
        )}

        {recording ? (
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
            <span className="font-display text-lg tabular-nums">{mmss(recSecs)}</span>
            <span className="flex-1 text-sm text-muted">Grabando nota de voz…</span>
            <button type="button" onClick={() => stopRecording(false)} className="btn-ghost h-11 px-4">Cancelar</button>
            <button type="button" onClick={() => stopRecording(true)} className="btn-primary h-11 px-4">Listo</button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowEmojis((v) => !v)}
              className={`grid h-12 w-11 shrink-0 place-items-center rounded-md border text-xl transition ${showEmojis ? "border-brand bg-brand-soft" : "border-line hover:border-brand"}`}
              aria-label="Emojis"
            >
              😊
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="grid h-12 w-11 shrink-0 place-items-center rounded-md border border-line text-lg transition hover:border-brand"
              aria-label="Adjuntar imagen o video"
              title="Imagen o video"
            >
              📎
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <textarea
              ref={textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                const f = e.clipboardData.files?.[0];
                if (f) {
                  e.preventDefault();
                  pickFile(f);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={file ? "Agrega un comentario (opcional)…" : "Escribe un mensaje…"}
              className="input max-h-40 min-h-12 flex-1 resize-none py-3"
            />
            {text.trim() || file ? (
              <button type="submit" disabled={sending} className="btn-primary h-12 shrink-0 px-5">
                {sending ? (file ? "Subiendo…" : "…") : "Enviar"}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="btn-primary grid h-12 w-12 shrink-0 place-items-center px-0 text-lg"
                aria-label="Grabar nota de voz"
                title="Nota de voz"
              >
                🎤
              </button>
            )}
          </div>
        )}
        <p className="mt-1.5 hidden text-[11px] text-muted sm:block">
          Enter para enviar · Shift+Enter para salto de línea · Puedes arrastrar o pegar imágenes · Máx. {MAX_MB} MB
        </p>
      </form>

      {/* Imagen en grande */}
      {lightbox && (
        <button
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4"
          aria-label="Cerrar imagen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      )}
    </div>
  );
}
