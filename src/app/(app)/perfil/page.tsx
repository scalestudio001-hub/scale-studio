import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { updateProfile } from "@/app/actions/admin";
import { updatePassword } from "@/app/actions/auth";
import { ActionForm } from "@/components/forms";
import { AvatarUploader } from "@/components/avatar-uploader";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const { profile, user } = await requireActive();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mi perfil"
        subtitle={user.email}
        actions={<Link href={`/miembros/${user.id}`} className="btn-ghost h-10">Ver mi perfil público ↗</Link>}
      />

      <div className="card p-6">
        <p className="eyebrow mb-5">Foto de perfil</p>
        <AvatarUploader userId={user.id} name={profile.full_name} url={profile.avatar_url} />
      </div>

      <div className="card mt-6 p-6">
        <p className="eyebrow mb-5">Sobre ti</p>
        <ActionForm action={updateProfile} submitLabel="Guardar cambios" buttonClassName="btn-primary">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="full_name">Nombre</label>
              <input className="input" id="full_name" name="full_name" defaultValue={profile.full_name} required maxLength={80} />
            </div>
            <div>
              <label className="label" htmlFor="city">Ciudad</label>
              <input className="input" id="city" name="city" defaultValue={profile.city ?? ""} maxLength={60} placeholder="Ej: Santiago" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="headline">Titular</label>
            <input className="input" id="headline" name="headline" defaultValue={profile.headline ?? ""} maxLength={80} placeholder="Ej: Dueño de tienda de accesorios para mascotas 🐾" />
          </div>
          <div>
            <label className="label" htmlFor="bio">Biografía</label>
            <textarea className="input min-h-32" id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={600} placeholder="Cuéntale a la comunidad quién eres, qué vendes y qué estás aprendiendo." />
            <p className="mt-1 text-xs text-muted">Máx. 600 caracteres.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="instagram">Instagram</label>
              <input className="input" id="instagram" name="instagram" defaultValue={profile.instagram ? `@${profile.instagram}` : ""} placeholder="@tuusuario" />
            </div>
            <div>
              <label className="label" htmlFor="website">Tienda o web</label>
              <input className="input" id="website" name="website" defaultValue={profile.website ?? ""} placeholder="mitienda.cl" />
            </div>
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
