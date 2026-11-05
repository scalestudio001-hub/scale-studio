import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm } from "@/components/forms";
import { login } from "@/app/actions/auth";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/cursos";
  const { user } = await getSession();
  if (user) redirect(next);

  return (
    <>
      <h1 className="display text-3xl">Bienvenido de vuelta 👋</h1>
      <p className="mb-6 mt-1 text-muted">Entra con tu correo y tu clave.</p>
      {sp.error === "link" && (
        <p className="mb-4 rounded-xl border border-brand/40 bg-brand-soft px-3.5 py-2.5 text-sm text-brand-light">
          El link expiró o ya se usó. Inicia sesión o pide uno nuevo.
        </p>
      )}
      <ActionForm action={login} submitLabel="Entrar" pendingText="Entrando…">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Clave</label>
            <Link href="/recuperar" className="mb-1.5 text-sm font-medium text-brand">¿La olvidaste?</Link>
          </div>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta? <Link href="/registro" className="font-semibold text-brand">Regístrate</Link>
      </p>
    </>
  );
}
