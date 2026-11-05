"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string; icon: string };

export function Nav({ items, footer }: { items: Item[]; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition ${
              active ? "bg-brand-soft text-brand shadow-[inset_2px_0_0_var(--brand)]" : "text-ink/75 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span className="text-lg">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Móvil */}
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost px-3 lg:hidden"
        aria-label="Abrir menú"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-line bg-surface p-4 shadow-lg lg:hidden">
          {links}
          <div className="mt-4 border-t border-line pt-4">{footer}</div>
        </div>
      )}
      {/* Escritorio */}
      <aside className="fixed bottom-0 left-0 top-16 hidden w-64 flex-col justify-between border-r border-line bg-surface/80 p-4 backdrop-blur-md lg:flex lg:gap-4">
        {links}
        {footer}
      </aside>
    </>
  );
}
