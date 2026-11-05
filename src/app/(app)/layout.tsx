import Link from "next/link";
import { requireActive } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Nav } from "@/components/nav";
import { Avatar, Logo } from "@/components/ui";
import { AppBackground } from "@/components/backgrounds";
import { NotificationBell, type Announcement, type Notif } from "@/components/notification-bell";
import { SupportButton, type SupportTopic } from "@/components/support-button";
import { HeaderSearch } from "@/components/header-search";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase, user } = await requireActive();
  const [{ data: anns }, { data: reads }, { data: notifs }, { data: topics }] = await Promise.all([
    supabase.from("announcements").select("id, title, body, link_url, priority, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("announcement_reads").select("announcement_id").eq("user_id", user.id),
    supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
    supabase.from("support_topics").select("id, label, description, emoji, contact_name, whatsapp").eq("active", true).order("position"),
  ]);
  const isAdmin = profile.role === "admin";

  const items = [
    { href: "/cursos", label: "Cursos", icon: "📚" },
    { href: "/comunidad", label: "Comunidad", icon: "📣" },
    { href: "/chat", label: "Chat grupal", icon: "💬" },
    { href: "/mensajes", label: "Mensajes", icon: "✉️" },
    { href: "/eventos", label: "Eventos", icon: "📆" },
    { href: "/miembros", label: "Miembros", icon: "👥" },
    { href: "/reuniones", label: "Reuniones", icon: "📅" },
    { href: "/perfil", label: "Mi perfil", icon: "👤" },
    ...(isAdmin ? [{ href: "/admin", label: "Administración", icon: "⚙️" }] : []),
  ];

  const footer = (
    <div className="flex items-center gap-3">
      <Link href="/perfil" className="shrink-0"><Avatar name={profile.full_name} url={profile.avatar_url} /></Link>
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
          <HeaderSearch />
          <NotificationBell
            initial={(anns ?? []) as Announcement[]}
            initialRead={(reads ?? []).map((r) => r.announcement_id as string)}
            initialNotifs={(notifs ?? []) as Notif[]}
            userId={user.id}
          />
          <Link href="/perfil" className="hidden lg:block">
            <Avatar name={profile.full_name} url={profile.avatar_url} size={34} />
          </Link>
          <Nav items={items} footer={footer} />
        </div>
      </header>
      <main className="px-4 pb-16 pt-24 lg:ml-64 lg:px-10">
        <div className="page-in mx-auto max-w-6xl">{children}</div>
      </main>
      <SupportButton topics={(topics ?? []) as SupportTopic[]} userName={profile.full_name.split(" ")[0] || "un alumno"} />
    </div>
  );
}
