import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm } from "@/components/forms";
import { register } from "@/app/actions/auth";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  const { user } = await getSession();
  if (user) redirect("/cursos");

  return (
    <>
      <h1 className="display text-3xl">Crea tu cuenta</h1>
      <p className="mb-6 mt-1 text-muted">Cuando el equipo apruebe tu cuenta vas a poder ver tus cursos.</p>
      <ActionForm action={register} submitLabel="Crear cuenta" pendingText="Creando cuenta…" hideOnSuccess>
        <div>
          <label className="label" htmlFor="full_name">Nombre y apellido</label>
          <input className="input" id="full_name" name="full_name" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">WhatsApp <span className="font-normal text-muted">(opcional)</span></label>
          <input className="input" id="phone" name="phone" type="tel" placeholder="+56 9 1234 5678" autoComplete="tel" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Clave</label>
            <input className="input" id="password" name="password" type="password" minLength={6} autoComplete="new-password" required />
          </div>
          <div>
            <label className="label" htmlFor="password2">Repite la clave</label>
            <input className="input" id="password2" name="password2" type="password" minLength={6} autoComplete="new-password" required />
          </div>
        </div>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand">Inicia sesión</Link>
      </p>
    </>
  );
}
