"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/actions/extras";
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

export type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

const ICON: Record<string, string> = {
  comment: "💬", like: "♥", lesson_reply: "↩️", lesson_question: "🙋", ticket_new: "🛟", ticket_reply: "🛟", ticket_done: "✅",
  event: "📆", meeting: "📅", meeting_cancel: "❌", dm: "✉️",
};

export function NotificationBell({
  initial,
  initialRead,
  initialNotifs = [],
  userId,
}: {
  initial: Announcement[];
  initialRead: string[];
  initialNotifs?: Notif[];
  userId: string;
}) {
  const supabase = getBrowserClient();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs);
  const [tab, setTab] = useState<"para-ti" | "anuncios">("para-ti");
  const [ntoast, setNtoast] = useState<Notif | null>(null);
  const [items, setItems] = useState(initial);
  const [read, setRead] = useState(() => new Set(initialRead));
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Announcement | null>(null);
  const [ring, setRing] = useState(false);
  const [modal, setModal] = useState<Announcement | null>(() => initial.find((a) => a.priority === "importante" && !initialRead.includes(a.id)) ?? null);
  const box = useRef<HTMLDivElement>(null);

  const unread = items.filter((a) => !read.has(a.id));
  const unreadNotifs = notifs.filter((n) => !n.read_at);
  const badge = unread.length + unreadNotifs.length;

  function openNotif(n: Notif) {
    if (!n.read_at) {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      markNotificationsRead([n.id]);
    }
    setOpen(false);
    setNtoast(null);
    if (n.link) router.push(n.link);
  }

  function readAllNotifs() {
    setNotifs((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    markNotificationsRead("all");
  }

  // Avisos personales en vivo
  useEffect(() => {
    const ch = supabase
      .channel(`notifs:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload: { new: Notif }) => {
        const n = payload.new;
        setNotifs((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 50)));
        setRing(true);
        setTimeout(() => setRing(false), 1200);
        if (!(n.type === "dm" && location.pathname.startsWith("/mensajes"))) {
          setNtoast(n);
          setTimeout(() => setNtoast((t) => (t?.id === n.id ? null : t)), 7000);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId]);

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
              setTab(unreadNotifs.length || !unread.length ? "para-ti" : "anuncios");
            }
          }}
          aria-label={`Notificaciones${badge ? ` (${badge} sin leer)` : ""}`}
          className={`relative grid h-10 w-10 place-items-center rounded-full border transition ${open ? "border-brand bg-brand-soft" : "border-line hover:border-brand"}`}
        >
          <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-current stroke-2 ${ring || badge ? "text-brand" : "text-ink"} ${ring ? "animate-[bell_1s_ease-in-out]" : ""}`}>
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
          </svg>
          {badge > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,.7)]">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
          {badge > 0 && <span className="absolute inset-0 animate-ping rounded-full border border-brand/50 [animation-duration:2.5s]" />}
        </button>

        {open && (
          <div className="anim-fade-up absolute right-0 top-12 z-[60] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-md border border-line bg-surface shadow-2xl shadow-black/70 [animation-duration:.25s]">
            <div className="flex items-center border-b border-line">
              {([
                { k: "para-ti", l: "Para ti", n: unreadNotifs.length },
                { k: "anuncios", l: "Anuncios", n: unread.length },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => {
                    setTab(t.k);
                    if (t.k === "anuncios") markRead(unread.map((a) => a.id));
                  }}
                  className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold uppercase tracking-[0.15em] ${
                    tab === t.k ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t.l}
                  {t.n > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{t.n}</span>}
                </button>
              ))}
            </div>
            {tab === "para-ti" && (
              <div className="max-h-[60vh] overflow-y-auto">
                {notifs.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">Aquí verás cuando te comenten, respondan o escriban.</p>}
                {notifs.length > 0 && unreadNotifs.length > 0 && (
                  <button onClick={readAllNotifs} className="w-full border-b border-line px-4 py-2 text-right text-xs text-brand hover:bg-surface-2">
                    Marcar todo como leído
                  </button>
                )}
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNotif(n)}
                    className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-surface-2 ${n.read_at ? "opacity-70" : "bg-brand-soft/40"}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm">{ICON[n.type] ?? "🔔"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-muted/70">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />}
                  </button>
                ))}
              </div>
            )}
            {tab === "anuncios" && (
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
            )}
          </div>
        )}
      </div>

      {/* Alerta de aviso personal */}
      {ntoast && !toast && (
        <div className="anim-fade-up fixed right-4 top-20 z-[70] w-[min(360px,calc(100vw-2rem))] [animation-duration:.4s]">
          <div className="relative flex gap-3 overflow-hidden rounded-md border border-line bg-surface p-4 shadow-2xl shadow-black/70">
            <span className="absolute inset-y-0 left-0 w-1 bg-brand" />
            <span className="text-xl">{ICON[ntoast.type] ?? "🔔"}</span>
            <button className="min-w-0 flex-1 text-left" onClick={() => openNotif(ntoast)}>
              <p className="text-sm font-semibold">{ntoast.title}</p>
              {ntoast.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{ntoast.body}</p>}
            </button>
            <button onClick={() => setNtoast(null)} className="h-6 text-muted hover:text-ink" aria-label="Cerrar">✕</button>
          </div>
        </div>
      )}

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
