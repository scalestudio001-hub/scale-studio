import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Cuenta en revisión" };

export default async function PendingPage() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile && (profile.status === "active" || profile.role === "admin")) redirect("/cursos");

  const blocked = profile?.status === "blocked";
  const name = profile?.full_name?.split(" ")[0] || "";

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl">
        {blocked ? "🔒" : "⏳"}
      </div>
      {blocked ? (
        <>
          <h1 className="display text-3xl">Tu acceso está pausado</h1>
          <p className="mt-2 text-muted">
            Si crees que es un error, escríbele al equipo para revisarlo.
          </p>
        </>
      ) : (
        <>
          <h1 className="display text-3xl">¡Ya casi{name ? `, ${name}` : ""}!</h1>
          <p className="mt-2 text-muted">
            Tu cuenta quedó creada y está en revisión. Apenas el equipo la apruebe vas a poder entrar a tus cursos.
            Puedes actualizar esta página en un rato.
          </p>
        </>
      )}
      <form action={logout} className="mt-6">
        <button className="btn-ghost">Cerrar sesión</button>
      </form>
    </div>
  );
}
