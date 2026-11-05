import Link from "next/link";
import { requireActive } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Nav } from "@/components/nav";
import { Avatar, Logo } from "@/components/ui";
import { AppBackground } from "@/components/backgrounds";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireActive();
  const isAdmin = profile.role === "admin";

  const items = [
    { href: "/cursos", label: "Cursos", icon: "📚" },
    { href: "/comunidad", label: "Comunidad", icon: "💬" },
    { href: "/perfil", label: "Mi perfil", icon: "👤" },
    ...(isAdmin ? [{ href: "/admin", label: "Administración", icon: "⚙️" }] : []),
  ];

  const footer = (
    <div className="flex items-center gap-3">
      <Avatar name={profile.full_name} url={profile.avatar_url} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{profile.full_name || "Alumno"}</p>
        <form action={logout}>
          <button className="text-xs font-medium text-muted hover:text-brand">Cerrar sesión</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="relative isolate min-h-screen">
      <AppBackground />
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur lg:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/perfil" className="hidden lg:block">
            <Avatar name={profile.full_name} url={profile.avatar_url} size={34} />
          </Link>
          <Nav items={items} footer={footer} />
        </div>
      </header>
      <main className="px-4 pb-16 pt-24 lg:ml-64 lg:px-10">
        <div className="page-in mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
