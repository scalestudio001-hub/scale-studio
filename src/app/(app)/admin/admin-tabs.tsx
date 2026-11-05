"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Alumnos" },
  { href: "/admin/planes", label: "Planes" },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/reuniones", label: "Reuniones" },
  { href: "/admin/anuncios", label: "Anuncios" },
  { href: "/admin/soporte", label: "Soporte" },
];

export function AdminTabs() {
  const path = usePathname();
  return (
    <div className="mb-8 flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-3 font-display text-sm font-medium uppercase tracking-[0.15em] ${
              active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
