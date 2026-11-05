"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MeetingTabs({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/reuniones", label: "Agendar y mis reuniones" },
    ...(isAdmin ? [{ href: "/reuniones/agenda", label: "Mi agenda de coach" }, { href: "/admin/reuniones", label: "Registro completo" }] : []),
  ];
  if (tabs.length === 1) return null;
  return (
    <div className="mb-8 flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = path === t.href;
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
