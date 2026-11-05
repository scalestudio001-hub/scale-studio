"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

/** Sube la portada de un curso (16:9) al bucket "content" y deja la URL en un input oculto `name`. */
export function CoverUploader({ name = "cover_url", initial }: { name?: string; initial?: string | null }) {
  const supabase = getBrowserClient();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("El archivo tiene que ser una imagen (JPG, PNG o WebP).");
    if (f.size > 8 * 1024 * 1024) return setError("La imagen pesa más de 8 MB. Comprímela e inténtalo de nuevo.");
    setError("");
    setBusy(true);
    const path = `portadas/${crypto.randomUUID()}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`;
    const { error: up } = await supabase.storage.from("content").upload(path, f, { contentType: f.type });
    setBusy(false);
    if (up) return setError("No se pudo subir la imagen: " + up.message);
    setUrl(supabase.storage.from("content").getPublicUrl(path).data.publicUrl);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div
        className="group relative aspect-video w-full max-w-xl cursor-pointer overflow-hidden rounded-md border border-dashed border-line bg-black transition hover:border-brand"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files?.[0]);
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Portada del curso" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">
            <div>
              <ImagePlus className="mx-auto mb-2 h-8 w-8 text-brand" strokeWidth={1.5} />
              <p className="font-medium text-ink">Sube la portada del curso</p>
              <p className="mt-1 text-xs">Haz clic o arrastra una imagen · 1280 × 720 px (16:9)</p>
            </div>
          </div>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-black/70 text-sm">Subiendo…</div>}
        {url && !busy && (
          <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
            Clic para cambiar
          </span>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>Recomendado: 1280 × 720 px. Deja el texto importante al centro.</span>
        {url && (
          <button type="button" onClick={() => setUrl("")} className="inline-flex items-center gap-1 text-red-400 hover:underline">
            <Trash2 className="h-3.5 w-3.5" /> Quitar portada
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
