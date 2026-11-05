"use client";

import { useRef, useState, useTransition } from "react";
import { Paperclip, Link2, MonitorPlay, BarChart3, Smile, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions/community";
import { Avatar } from "@/components/ui";
import { COMMUNITY_CATEGORIES, SITE_NAME } from "@/lib/utils";

const EMOJIS = ["😀", "😂", "😍", "🥳", "😎", "🤔", "🙌", "👏", "🙏", "💪", "👍", "❤️", "🔥", "🚀", "💯", "✅", "🎉", "🏆", "💰", "📈", "📦", "💡", "⚠️", "📣"];
const MAX_MB = 50;

type Tool = "link" | "video" | "poll" | "emoji" | null;

export function PostComposer({
  me,
  isAdmin,
}: {
  me: { id: string; full_name: string; avatar_url: string | null };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [poll, setPoll] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const cats = COMMUNITY_CATEGORIES.filter((c) => isAdmin || c !== "Anuncios");

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setTitle("");
    setBody("");
    setCategory("General");
    setFile(null);
    setPreview(null);
    setLink("");
    setPoll([]);
    setTool(null);
    setError("");
    setOpen(false);
  }

  function pickFile(f?: File | null) {
    if (!f) return;
    if (!/^(image|video)\//.test(f.type)) return setError("Solo imágenes o videos.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`El archivo pesa más de ${MAX_MB} MB.`);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function addEmoji(e: string) {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + e + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + e.length, start + e.length);
    });
  }

  async function submit() {
    if (!title.trim()) return setError("Escribe un título.");
    const options = poll.map((o) => o.trim()).filter(Boolean);
    if (tool === "poll" && poll.length && options.length < 2) return setError("La encuesta necesita al menos 2 opciones.");
    setBusy(true);
    setError("");

    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("category", category);
    fd.set("link_url", link);
    if (notify) fd.set("notify", "1");
    options.forEach((o) => fd.append("poll", o));

    if (file) {
      const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "bin").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error: up } = await supabase.storage.from("community").upload(path, file, { contentType: file.type });
      if (up) {
        setBusy(false);
        return setError("No se pudo subir el archivo: " + up.message);
      }
      fd.set("attachment_path", path);
      fd.set("attachment_type", file.type.startsWith("video/") ? "video" : "image");
    }

    const res = await createPost(undefined, fd);
    setBusy(false);
    if (res?.error) return setError(res.error);
    reset();
    setNotify(false);
    if (res?.ok) {
      setOkMsg(res.ok);
      setTimeout(() => setOkMsg(""), 5000);
    }
    startTransition(() => router.refresh());
  }

  if (!open)
    return (
      <>
      {okMsg && <p className="anim-fade-up mb-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-4 py-2.5 text-sm text-emerald-300">{okMsg}</p>}
      <button onClick={() => setOpen(true)} className="card mb-6 flex w-full items-center gap-3 p-4 text-left transition hover:border-brand/40">
        <Avatar name={me.full_name} url={me.avatar_url} />
        <span className="flex-1 rounded-md border border-line bg-bg px-4 py-3 text-muted">Escribe algo…</span>
      </button>
      </>
    );

  const toolBtn = (t: Exclude<Tool, null>, Icon: LucideIcon, label: string) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        setTool(tool === t ? null : t);
        if (t === "poll" && !poll.length) setPoll(["", ""]);
      }}
      className={`grid h-10 w-10 place-items-center rounded-md transition ${tool === t ? "bg-brand-soft text-brand" : "text-brand/70 hover:bg-surface-2 hover:text-brand"}`}
    >
      <Icon strokeWidth={1.6} className="h-5 w-5" />
    </button>
  );

  return (
    <div className="card anim-fade-up mb-6 p-5 [animation-duration:.3s]">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Avatar name={me.full_name} url={me.avatar_url} size={32} />
        <span className="font-semibold">{me.full_name}</span>
        <span className="text-muted">publicando en</span>
        <span className="font-semibold text-brand">{SITE_NAME}</span>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={140}
        placeholder="Título"
        autoFocus
        className="w-full bg-transparent py-2 font-display text-2xl font-semibold uppercase tracking-tight outline-none placeholder:text-muted/50"
      />
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onPaste={(e) => {
          const f = e.clipboardData.files?.[0];
          if (f) {
            e.preventDefault();
            pickFile(f);
          }
        }}
        placeholder="Escribe algo…"
        className="min-h-28 w-full resize-y bg-transparent py-2 text-[15px] outline-none placeholder:text-muted/60"
      />

      {preview && file && (
        <div className="relative mt-2 w-fit overflow-hidden rounded-md border border-line">
          {file.type.startsWith("video/") ? (
            <video src={preview} className="max-h-64 max-w-full bg-black" controls muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-64 max-w-full object-contain" />
          )}
          <button
            type="button"
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setFile(null);
              setPreview(null);
            }}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-sm hover:bg-red-600"
            aria-label="Quitar archivo"
          >
            ✕
          </button>
        </div>
      )}

      {(tool === "link" || tool === "video") && (
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="input mt-2"
          placeholder={tool === "video" ? "Link de YouTube o Vimeo" : "https://…"}
          autoFocus
        />
      )}

      {tool === "poll" && (
        <div className="mt-3 space-y-2 rounded-md border border-line p-3">
          <p className="label">Encuesta</p>
          {poll.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={o}
                onChange={(e) => setPoll(poll.map((x, j) => (j === i ? e.target.value : x)))}
                maxLength={120}
                placeholder={`Opción ${i + 1}`}
                className="input py-2"
              />
              {poll.length > 2 && (
                <button type="button" onClick={() => setPoll(poll.filter((_, j) => j !== i))} className="px-2 text-muted hover:text-red-400">
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex justify-between">
            {poll.length < 10 && (
              <button type="button" onClick={() => setPoll([...poll, ""])} className="text-sm font-semibold text-brand">
                + Agregar opción
              </button>
            )}
            <button type="button" onClick={() => { setPoll([]); setTool(null); }} className="text-xs text-muted hover:text-red-400">
              Quitar encuesta
            </button>
          </div>
        </div>
      )}

      {tool === "emoji" && (
        <div className="mt-2 grid w-fit grid-cols-8 gap-1 rounded-md border border-line bg-surface-2 p-2 sm:grid-cols-12">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => addEmoji(e)} className="rounded p-1 text-xl transition hover:scale-125">
              {e}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <button
          type="button"
          title="Imagen o video"
          aria-label="Adjuntar imagen o video"
          onClick={() => fileInput.current?.click()}
          className="grid h-10 w-10 place-items-center rounded-md text-brand/70 transition hover:bg-surface-2 hover:text-brand"
        >
          <Paperclip strokeWidth={1.6} className="h-5 w-5" />
        </button>
        <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        {toolBtn("link", Link2, "Link")}
        {toolBtn("video", MonitorPlay, "Video de YouTube o Vimeo")}
        {toolBtn("poll", BarChart3, "Encuesta")}
        {toolBtn("emoji", Smile, "Emojis")}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input ml-1 h-10 w-auto py-0 text-sm">
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={reset} className="btn-ghost h-10 px-4" disabled={busy}>
            Cancelar
          </button>
          <button type="button" onClick={submit} className="btn-primary h-10 px-5" disabled={busy || !title.trim()}>
            {busy ? (file ? "Subiendo…" : "Publicando…") : "Publicar"}
          </button>
        </div>
      </div>

      {isAdmin && (
        <label className="mt-3 flex cursor-pointer items-center justify-end gap-3 text-sm text-muted">
          <span>✉️ Enviar por correo a todos los alumnos</span>
          <button
            type="button"
            role="switch"
            aria-checked={notify}
            onClick={() => setNotify(!notify)}
            className={`relative h-6 w-11 rounded-full transition ${notify ? "bg-brand" : "bg-line"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${notify ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </label>
      )}
    </div>
  );
}
