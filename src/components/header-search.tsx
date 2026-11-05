"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => input.current?.focus(), 30);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => input.current?.focus(), 30);
        }}
        className="flex h-10 items-center gap-2 rounded-full border border-line px-3 text-sm text-muted transition hover:border-brand hover:text-ink"
        aria-label="Buscar"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
        <span className="hidden md:inline">Buscar…</span>
        <kbd className="hidden rounded border border-line px-1.5 text-[10px] md:inline">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <form
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!q.trim()) return;
              setOpen(false);
              router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
            }}
            className="anim-fade-up mx-auto flex max-w-xl items-center gap-3 rounded-md border border-brand/50 bg-surface px-4 shadow-2xl [animation-duration:.25s]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-brand stroke-2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busca clases, cursos, publicaciones o miembros…"
              className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
            />
            <kbd className="rounded border border-line px-1.5 text-[10px] text-muted">Enter</kbd>
          </form>
        </div>
      )}
    </>
  );
}
