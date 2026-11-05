import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm } from "@/components/forms";
import { updatePassword } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Nueva clave" };

export default function NewPasswordPage() {
  return (
    <>
      <h1 className="display text-3xl">Crea tu nueva clave</h1>
      <p className="mb-6 mt-1 text-muted">Elige una clave de al menos 6 caracteres.</p>
      <ActionForm action={updatePassword} submitLabel="Guardar clave" hideOnSuccess>
        <div>
          <label className="label" htmlFor="password">Nueva clave</label>
          <input className="input" id="password" name="password" type="password" minLength={6} autoComplete="new-password" required />
        </div>
        <div>
          <label className="label" htmlFor="password2">Repite la clave</label>
          <input className="input" id="password2" name="password2" type="password" minLength={6} autoComplete="new-password" required />
        </div>
      </ActionForm>
      <p className="mt-6 text-center text-sm">
        <Link href="/cursos" className="font-semibold text-brand">Ir a mis cursos →</Link>
      </p>
    </>
  );
}
