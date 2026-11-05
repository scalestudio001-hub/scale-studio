"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { setAvatar } from "@/app/actions/admin";
import { Avatar } from "@/components/ui";

/** Recorta al centro en cuadrado y achica a 512 px antes de subir. */
async function toSquare(file: File, size = 512): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo procesar"))), "image/jpeg", 0.88));
}

export function AvatarUploader({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const supabase = getBrowserClient();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  async function onPick(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Elige una imagen.");
    if (f.size > 15 * 1024 * 1024) return setError("La imagen pesa demasiado (máx. 15 MB).");
    setBusy(true);
    setError("");
    try {
      const blob = await toSquare(f);
      const path = `${userId}/${Date.now()}.jpg`;
      const { error: up } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
      if (up) throw new Error(up.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const res = await setAvatar(data.publicUrl);
      if (res?.error) throw new Error(res.error);
      setPreview(data.publicUrl);
      start(() => router.refresh());
    } catch (e) {
      setError("No se pudo subir la foto: " + (e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    await setAvatar(null);
    setPreview(null);
    setBusy(false);
    start(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative rounded-full ring-2 ring-brand/40 ring-offset-4 ring-offset-surface transition hover:ring-brand"
        aria-label="Cambiar foto"
      >
        <Avatar name={name} url={preview} size={96} />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-xs font-semibold opacity-0 transition group-hover:opacity-100">
          {busy ? "Subiendo…" : "📷 Cambiar"}
        </span>
      </button>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="btn-primary h-10 px-4">
            {busy ? "Subiendo…" : preview ? "Cambiar foto" : "Subir foto"}
          </button>
          {preview && (
            <button type="button" onClick={remove} disabled={busy} className="btn-ghost h-10 px-4">
              Quitar
            </button>
          )}
        </div>
        <p className="text-xs text-muted">JPG o PNG. Se recorta en cuadrado automáticamente.</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
    </div>
  );
}
