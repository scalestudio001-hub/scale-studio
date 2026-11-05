import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm } from "@/components/forms";
import { requestReset } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Recuperar clave" };

export default function RecoverPage() {
  return (
    <>
      <h1 className="display text-3xl">Recupera tu clave</h1>
      <p className="mb-6 mt-1 text-muted">Te enviaremos un link a tu correo para crear una nueva.</p>
      <ActionForm action={requestReset} submitLabel="Enviar link" pendingText="Enviando…" hideOnSuccess>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-brand">← Volver a iniciar sesión</Link>
      </p>
    </>
  );
}
