"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, Megaphone, MessagesSquare, Mail, CalendarDays, Users, CalendarClock, UserRound, Settings2, Menu, X, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  cursos: BookOpen, comunidad: Megaphone, chat: MessagesSquare, mensajes: Mail, eventos: CalendarDays,
  miembros: Users, reuniones: CalendarClock, perfil: UserRound, admin: Settings2,
};

type Item = { href: string; label: string; icon: string };

export function Nav({ items, footer, variant }: { items: Item[]; footer: React.ReactNode; variant: "mobile" | "desktop" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex flex-col gap-0.5">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        const Icon = ICONS[it.icon] ?? BookOpen;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition ${
              active ? "bg-brand-soft text-brand shadow-[inset_2px_0_0_var(--brand)]" : "text-ink/75 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon
              strokeWidth={1.6}
              className={`h-[19px] w-[19px] shrink-0 transition ${active ? "text-brand" : "text-brand/70 group-hover:text-brand"}`}
            />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  if (variant === "desktop")
    return (
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-4 overflow-y-auto border-r border-line bg-surface/80 p-4 backdrop-blur-md lg:flex">
        {links}
        <div className="mt-auto">{footer}</div>
      </aside>
    );

  return (
    <>
      {/* Móvil */}
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost px-3 lg:hidden"
        aria-label="Abrir menú"
      >
        {open ? <X strokeWidth={1.6} className="h-5 w-5 text-brand" /> : <Menu strokeWidth={1.6} className="h-5 w-5 text-brand" />}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-16 z-40 max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-line bg-surface p-4 shadow-lg lg:hidden">
          {links}
          <div className="mt-4 border-t border-line pt-4">{footer}</div>
        </div>
      )}
    </>
  );
}
