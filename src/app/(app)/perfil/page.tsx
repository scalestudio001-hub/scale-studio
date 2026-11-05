import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { updateProfile } from "@/app/actions/admin";
import { updatePassword } from "@/app/actions/auth";
import { ActionForm } from "@/components/forms";
import { Avatar, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const { profile, user } = await requireActive();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Mi cuenta" title="Mi perfil" subtitle={user.email} />
      <div className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={profile.full_name} url={profile.avatar_url} size={64} />
          <div>
            <p className="font-semibold">{profile.full_name}</p>
            <p className="text-sm text-muted">{profile.role === "admin" ? "Equipo" : "Alumno"}</p>
          </div>
        </div>
        <ActionForm action={updateProfile} submitLabel="Guardar cambios" buttonClassName="btn-primary">
          <div>
            <label className="label" htmlFor="full_name">Nombre</label>
            <input className="input" id="full_name" name="full_name" defaultValue={profile.full_name} required />
          </div>
          <div>
            <label className="label" htmlFor="avatar_url">Foto de perfil (link)</label>
            <input className="input" id="avatar_url" name="avatar_url" defaultValue={profile.avatar_url ?? ""} placeholder="https://…" />
          </div>
        </ActionForm>
      </div>
      <div className="card mt-6 p-6">
        <p className="eyebrow mb-5">Cambiar clave</p>
        <ActionForm action={updatePassword} submitLabel="Actualizar clave" buttonClassName="btn-ghost" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="password">Nueva clave</label>
              <input className="input" id="password" name="password" type="password" minLength={6} autoComplete="new-password" required />
            </div>
            <div>
              <label className="label" htmlFor="password2">Repítela</label>
              <input className="input" id="password2" name="password2" type="password" minLength={6} autoComplete="new-password" required />
            </div>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
