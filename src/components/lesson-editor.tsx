"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase/client";
import { saveLessonFull } from "@/app/actions/lesson-editor";
import { RichEditor } from "@/components/rich-editor";
import { toEmbedUrl } from "@/lib/utils";
import type { LessonFile } from "@/lib/types";

const MAX_MB = 50;

export function fileIcon(type: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (type.includes("pdf") || ext === "pdf") return { label: "PDF", cls: "bg-red-600" };
  if (type.startsWith("image/")) return { label: "IMG", cls: "bg-violet-600" };
  if (type.startsWith("video/")) return { label: "VID", cls: "bg-sky-600" };
  if (type.startsWith("audio/")) return { label: "AUD", cls: "bg-pink-600" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { label: "XLS", cls: "bg-emerald-600" };
  if (["doc", "docx"].includes(ext)) return { label: "DOC", cls: "bg-blue-600" };
  if (["ppt", "pptx"].includes(ext)) return { label: "PPT", cls: "bg-orange-600" };
  if (["zip", "rar"].includes(ext)) return { label: "ZIP", cls: "bg-neutral-600" };
  return { label: ext.slice(0, 3).toUpperCase() || "FILE", cls: "bg-neutral-600" };
}

export const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

type Props = {
  courseId: string;
  lesson: {
    id: string; title: string; duration_min: number | null; published: boolean; video_url: string | null; video_path: string | null;
    content_html: string | null; description: string | null; files: LessonFile[];
  };
  videoSigned: string | null;
};

export function LessonEditor({ courseId, lesson, videoSigned }: Props) {
  const supabase = getBrowserClient();
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [duration, setDuration] = useState(lesson.duration_min ? String(lesson.duration_min) : "");
  const [published, setPublished] = useState(lesson.published);
  const [mode, setMode] = useState<"upload" | "link">(lesson.video_path ? "upload" : "link");
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [videoPath, setVideoPath] = useState<string | null>(lesson.video_path);
  const [videoPreview, setVideoPreview] = useState<string | null>(videoSigned);
  const [html, setHtml] = useState(lesson.content_html || (lesson.description ? `<p>${lesson.description.replace(/\n/g, "<br>")}</p>` : ""));
  const [files, setFiles] = useState<LessonFile[]>(lesson.files ?? []);
  const [progress, setProgress] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [dirty, setDirty] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const touch = () => {
    setDirty(true);
    setMsg({});
  };

  async function upload(f: File) {
    const ext = (f.name.split(".").pop() || "bin").toLowerCase();
    const path = `${courseId}/${lesson.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("lessons").upload(path, f, { contentType: f.type || "application/octet-stream" });
    if (error) throw new Error(error.message.includes("exceeded") || error.message.includes("size") ? `El archivo supera el máximo de ${MAX_MB} MB` : error.message);
    return path;
  }

  async function onVideo(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("video/")) return setMsg({ error: "Elige un archivo de video (MP4, MOV…)." });
    if (f.size > MAX_MB * 1024 * 1024)
      return setMsg({ error: `El video pesa ${fmtSize(f.size)}. El máximo actual es ${MAX_MB} MB — para clases largas usa un link de Bunny, Vimeo o YouTube.` });
    setProgress(`Subiendo video (${fmtSize(f.size)})…`);
    try {
      const path = await upload(f);
      setVideoPath(path);
      setVideoPreview(URL.createObjectURL(f));
      touch();
    } catch (e) {
      setMsg({ error: "No se pudo subir el video: " + (e as Error).message });
    } finally {
      setProgress("");
      if (videoInput.current) videoInput.current.value = "";
    }
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const arr = Array.from(list);
    const big = arr.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (big) return setMsg({ error: `"${big.name}" supera ${MAX_MB} MB.` });
    try {
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i];
        setProgress(`Subiendo ${i + 1} de ${arr.length}: ${f.name}`);
        const path = await upload(f);
        setFiles((prev) => [...prev, { name: f.name, path, size: f.size, type: f.type || "application/octet-stream" }]);
      }
      touch();
    } catch (e) {
      setMsg({ error: "No se pudo subir: " + (e as Error).message });
    } finally {
      setProgress("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    const res = await saveLessonFull({
      id: lesson.id,
      courseId,
      title,
      durationMin: duration ? Number(duration) : null,
      published,
      videoUrl: mode === "link" ? videoUrl : "",
      videoPath: mode === "upload" ? videoPath : null,
      html,
      files,
    });
    setSaving(false);
    setMsg(res);
    if (res.ok) {
      setDirty(false);
      router.refresh();
    }
  }

  const embed = mode === "link" ? toEmbedUrl(videoUrl) : null;

  return (
    <div className="card overflow-hidden">
      {/* Título */}
      <div className="border-b border-line p-5 sm:p-6">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            touch();
          }}
          placeholder="Título de la clase"
          className="w-full bg-transparent font-display text-3xl font-semibold uppercase tracking-tight outline-none placeholder:text-muted/40 sm:text-4xl"
        />
      </div>

      {/* Video */}
      <div className="border-b border-line p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="label !mb-0 mr-2">Video de la clase</p>
          {(["upload", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                touch();
              }}
              className={`chip h-8 border px-3 ${mode === m ? "border-brand bg-brand text-on-brand" : "border-line text-muted hover:border-brand"}`}
            >
              {m === "upload" ? "📹 Subir video" : "🔗 Link (YouTube, Vimeo, Bunny)"}
            </button>
          ))}
        </div>

        {mode === "upload" ? (
          videoPreview ? (
            <div className="relative overflow-hidden rounded-md border border-line bg-black">
              <video src={videoPreview} controls className="aspect-video w-full" />
              <div className="flex justify-end gap-2 border-t border-line bg-surface p-2">
                <button type="button" onClick={() => videoInput.current?.click()} className="btn-ghost h-9 text-xs">Reemplazar</button>
                <button
                  type="button"
                  onClick={() => {
                    setVideoPath(null);
                    setVideoPreview(null);
                    touch();
                  }}
                  className="btn-danger h-9 text-xs"
                >
                  Quitar video
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onVideo(e.dataTransfer.files?.[0]);
              }}
              className="grid aspect-video w-full place-items-center rounded-md border-2 border-dashed border-line bg-bg text-center transition hover:border-brand"
            >
              <span>
                <span className="block text-4xl">📹</span>
                <span className="mt-2 block font-semibold">Arrastra tu video aquí o haz clic para subirlo</span>
                <span className="mt-1 block text-xs text-muted">MP4 o MOV · máximo {MAX_MB} MB</span>
              </span>
            </button>
          )
        ) : (
          <>
            <input
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                touch();
              }}
              className="input"
              placeholder="https://youtu.be/…  ·  https://vimeo.com/…  ·  https://iframe.mediadelivery.net/…"
            />
            {embed && (
              <div className="mt-3 aspect-video overflow-hidden rounded-md border border-line bg-black">
                <iframe src={embed} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Vista previa" />
              </div>
            )}
          </>
        )}
        <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => onVideo(e.target.files?.[0])} />
      </div>

      {/* Texto */}
      <div className="border-b border-line p-5 sm:p-6">
        <p className="label">Contenido</p>
        <RichEditor
          initial={html}
          onChange={(h) => {
            setHtml(h);
            touch();
          }}
        />
      </div>

      {/* Recursos */}
      <div className="border-b border-line p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="label !mb-0">Recursos descargables</p>
          <button type="button" onClick={() => fileInput.current?.click()} className="btn-ghost h-9 text-xs">📎 Agregar archivos</button>
        </div>
        {files.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFiles(e.dataTransfer.files);
            }}
            className="w-full rounded-md border-2 border-dashed border-line px-4 py-8 text-sm text-muted transition hover:border-brand hover:text-ink"
          >
            Arrastra PDF, Excel, imágenes, presentaciones… o haz clic para subir
          </button>
        ) : (
          <ul className="space-y-2">
            {files.map((f, i) => {
              const ic = fileIcon(f.type, f.name);
              return (
                <li key={f.path} className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5">
                  <span className={`grid h-8 w-10 shrink-0 place-items-center rounded text-[10px] font-bold text-white ${ic.cls}`}>{ic.label}</span>
                  <input
                    value={f.name}
                    onChange={(e) => {
                      setFiles(files.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)));
                      touch();
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-brand outline-none"
                    title="Puedes cambiarle el nombre"
                  />
                  <span className="text-xs text-muted">{fmtSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles(files.filter((_, j) => j !== i));
                      touch();
                    }}
                    className="px-1 text-muted hover:text-red-400"
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {/* Barra inferior */}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 bg-surface/95 p-4 backdrop-blur sm:px-6">
        <label className="flex items-center gap-2 text-sm text-muted">
          Minutos
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              touch();
            }}
            className="input h-10 w-20 py-0"
          />
        </label>
        {progress && <span className="animate-pulse text-sm text-brand">⏳ {progress}</span>}
        {msg.error && <span className="text-sm text-red-400">{msg.error}</span>}
        {msg.ok && <span className="text-sm text-emerald-400">{msg.ok}</span>}
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={published}
            onClick={() => {
              setPublished(!published);
              touch();
            }}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <span className={published ? "text-emerald-400" : "text-muted"}>{published ? "Publicada" : "Borrador"}</span>
            <span className={`relative h-6 w-11 rounded-full transition ${published ? "bg-emerald-500" : "bg-line"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${published ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>
          <Link href={`/admin/cursos/${courseId}`} className="btn-ghost h-11">{dirty ? "Cancelar" : "Volver"}</Link>
          <button type="button" onClick={save} disabled={saving || !!progress} className="btn-primary h-11 px-6">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
