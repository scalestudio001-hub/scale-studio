"use client";

import { useState } from "react";
import { fileIcon, fmtSize } from "@/components/lesson-editor";

export type ResourceItem = { name: string; url: string; type: string; size?: number; external?: boolean };

export function ResourceList({ items }: { items: ResourceItem[] }) {
  const [preview, setPreview] = useState<ResourceItem | null>(null);
  const images = items.filter((r) => r.type.startsWith("image/"));
  const others = items.filter((r) => !r.type.startsWith("image/"));
  const canPreview = (r: ResourceItem) => r.type.includes("pdf") || r.type.startsWith("video/") || r.type.startsWith("audio/") || r.type.startsWith("image/");

  return (
    <div className="mt-6 rounded-md border border-line bg-surface-2/60 p-5">
      <p className="mb-3 text-sm font-bold">📎 Recursos de la clase</p>

      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {images.map((r) => (
            <button key={r.url} onClick={() => setPreview(r)} className="group relative aspect-square overflow-hidden rounded-md border border-line bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt={r.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 text-left text-[11px]">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {others.map((r) => {
          const ic = r.external ? { label: "LINK", cls: "bg-neutral-600" } : fileIcon(r.type, r.name);
          return (
            <li key={r.url} className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5">
              <span className={`grid h-8 w-10 shrink-0 place-items-center rounded text-[10px] font-bold text-white ${ic.cls}`}>{ic.label}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                {r.size ? <span className="text-xs text-muted">{fmtSize(r.size)}</span> : null}
              </span>
              {!r.external && canPreview(r) && (
                <button onClick={() => setPreview(r)} className="btn-ghost h-9 px-3 text-xs">👁 Ver</button>
              )}
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                download={r.external ? undefined : r.name}
                className="btn-primary h-9 px-3 text-xs"
              >
                {r.external ? "Abrir ↗" : "⬇ Descargar"}
              </a>
            </li>
          );
        })}
      </ul>

      {preview && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/90 p-3 backdrop-blur-sm sm:p-6" onClick={() => setPreview(null)}>
          <div className="mb-3 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="flex-1 truncate font-semibold">{preview.name}</p>
            <a href={preview.url} target="_blank" rel="noopener noreferrer" download={preview.name} className="btn-primary h-10 px-4 text-sm">⬇ Descargar</a>
            <button onClick={() => setPreview(null)} className="btn-ghost h-10 px-4">✕ Cerrar</button>
          </div>
          <div className="grid min-h-0 flex-1 place-items-center" onClick={(e) => e.stopPropagation()}>
            {preview.type.includes("pdf") ? (
              <iframe src={preview.url} className="h-full w-full rounded-md bg-white" title={preview.name} />
            ) : preview.type.startsWith("video/") ? (
              <video src={preview.url} controls autoPlay className="max-h-full max-w-full rounded-md" />
            ) : preview.type.startsWith("audio/") ? (
              <audio src={preview.url} controls autoPlay className="w-full max-w-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.name} className="max-h-full max-w-full rounded-md object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
