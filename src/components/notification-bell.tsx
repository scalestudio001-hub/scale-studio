"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase/client";
import { markAnnouncementsRead } from "@/app/actions/announcements";
import { RichText } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  priority: "normal" | "importante";
  created_at: string;
};

export function NotificationBell({ initial, initialRead }: { initial: Announcement[]; initialRead: string[] }) {
  const supabase = getBrowserClient();
  const [items, setItems] = useState(initial);
  const [read, setRead] = useState(() => new Set(initialRead));
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Announcement | null>(null);
  const [ring, setRing] = useState(false);
  const [modal, setModal] = useState<Announcement | null>(() => initial.find((a) => a.priority === "importante" && !initialRead.includes(a.id)) ?? null);
  const box = useRef<HTMLDivElement>(null);

  const unread = items.filter((a) => !read.has(a.id));

  function markRead(ids: string[]) {
    const fresh = ids.filter((id) => !read.has(id));
    if (!fresh.length) return;
    setRead((prev) => new Set([...prev, ...fresh]));
    markAnnouncementsRead(fresh);
  }

  // Nuevos anuncios en vivo
  useEffect(() => {
    const ch = supabase
      .channel("announcements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload: { new: Announcement }) => {
        const a = payload.new;
        setItems((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev]));
        setRing(true);
        setTimeout(() => setRing(false), 1200);
        if (a.priority === "importante") setModal(a);
        else {
          setToast(a);
          setTimeout(() => setToast((t) => (t?.id === a.id ? null : t)), 8000);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "announcements" }, (payload: { old: { id: string } }) =>
        setItems((prev) => prev.filter((x) => x.id !== payload.old.id)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <div ref={box} className="relative">
        <button
          onClick={() => {
            setOpen(!open);
            if (!open) {
              setFresh(new Set(unread.map((a) => a.id)));
              markRead(unread.map((a) => a.id));
            }
          }}
          aria-label={`Anuncios${unread.length ? ` (${unread.length} sin leer)` : ""}`}
          className={`relative grid h-10 w-10 place-items-center rounded-full border transition ${open ? "border-brand bg-brand-soft" : "border-line hover:border-brand"}`}
        >
          <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-current stroke-2 ${ring || unread.length ? "text-brand" : "text-ink"} ${ring ? "animate-[bell_1s_ease-in-out]" : ""}`}>
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
          </svg>
          {unread.length > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,.7)]">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
          {unread.length > 0 && <span className="absolute inset-0 animate-ping rounded-full border border-brand/50 [animation-duration:2.5s]" />}
        </button>

        {open && (
          <div className="anim-fade-up absolute right-0 top-12 z-[60] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-md border border-line bg-surface shadow-2xl shadow-black/70 [animation-duration:.25s]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="eyebrow">Anuncios</p>
              <span className="text-xs text-muted">{items.length}</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No hay anuncios por ahora.</p>}
              {items.map((a) => {
                const isNew = fresh.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setModal(a);
                      setOpen(false);
                    }}
                    className="flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-surface-2"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isNew ? "bg-brand shadow-[0_0_8px_var(--brand)]" : "bg-transparent"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {a.priority === "importante" && <span className="chip bg-red-500/90 py-0 text-[9px] text-white">Importante</span>}
                        <span className="truncate text-sm font-semibold">{a.title}</span>
                      </span>
                      {a.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{a.body}</span>}
                      <span className="mt-1 block text-[11px] text-muted/70">{timeAgo(a.created_at)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Alerta que salta (anuncio normal) */}
      {toast && (
        <div className="anim-fade-up fixed right-4 top-20 z-[70] w-[min(360px,calc(100vw-2rem))] [animation-duration:.4s]">
          <div className="relative overflow-hidden rounded-md border border-brand/60 bg-surface p-4 shadow-2xl shadow-black/70">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-dark via-brand to-brand-light" />
            <div className="flex gap-3">
              <span className="text-2xl">🔔</span>
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  setModal(toast);
                  setToast(null);
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Nuevo anuncio</p>
                <p className="mt-0.5 font-semibold">{toast.title}</p>
                {toast.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{toast.body}</p>}
              </button>
              <button onClick={() => setToast(null)} className="h-6 text-muted hover:text-ink" aria-label="Cerrar">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Ventana del anuncio (los importantes aparecen solos hasta que se lean) */}
      {modal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="anim-fade-up relative w-full max-w-lg overflow-hidden rounded-md border border-brand/50 bg-surface shadow-2xl shadow-black [animation-duration:.4s]">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-dark via-brand to-brand-light" />
            <div aria-hidden className="anim-glow-a pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.25),transparent_62%)]" />
            <div className="relative p-6 sm:p-8">
              <p className="eyebrow">{modal.priority === "importante" ? "📢 Anuncio importante" : "🔔 Anuncio"}</p>
              <h2 className="display mt-4 text-3xl sm:text-4xl">{modal.title}</h2>
              <p className="mt-1 text-xs text-muted">{timeAgo(modal.created_at)}</p>
              {modal.body && <RichText text={modal.body} className="mt-4 max-h-[45vh] overflow-y-auto text-[15px] text-ink/85" />}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {modal.link_url && (
                  <Link
                    href={modal.link_url}
                    target={modal.link_url.startsWith("/") ? undefined : "_blank"}
                    onClick={() => {
                      markRead([modal.id]);
                      setModal(null);
                    }}
                    className="btn-outline"
                  >
                    Ver más ↗
                  </Link>
                )}
                <button
                  onClick={() => {
                    markRead([modal.id]);
                    setModal(null);
                  }}
                  className="btn-primary"
                >
                  Entendido 👍
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
