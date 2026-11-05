import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { updateUser } from "@/app/actions/admin";
import { SubmitButton } from "@/components/forms";
import { Avatar } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { AdminUser, Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Alumnos" };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-brand text-on-brand" },
  active: { label: "Activo", cls: "border border-emerald-700/60 text-emerald-400" },
  blocked: { label: "Bloqueado", cls: "border border-red-800/60 text-red-400" },
};

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin">) {
  const { supabase, user: me } = await requireAdmin();
  const sp = await searchParams;
  const filter = typeof sp.f === "string" ? sp.f : "";
  const q = typeof sp.q === "string" ? sp.q.toLowerCase().trim() : "";

  const [{ data: users }, { data: plans }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.from("plans").select("*").order("name"),
  ]);
  const all = (users ?? []) as AdminUser[];
  const planList = (plans ?? []) as Plan[];
  const counts = {
    pending: all.filter((u) => u.status === "pending").length,
    active: all.filter((u) => u.status === "active").length,
    blocked: all.filter((u) => u.status === "blocked").length,
  };
  const list = all
    .filter((u) => !filter || u.status === filter)
    .filter((u) => !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(["pending", "active", "blocked"] as const).map((s) => (
          <Link key={s} href={filter === s ? "/admin" : `/admin?f=${s}`} className={`card card-hover p-5 ${filter === s ? "border-brand" : ""}`}>
            <p className="label">{STATUS[s].label}s</p>
            <p className="font-display text-4xl font-semibold">{counts[s]}</p>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex gap-2">
        {filter && <input type="hidden" name="f" value={filter} />}
        <input name="q" defaultValue={q} className="input" placeholder="Buscar por nombre o correo…" />
        <button className="btn-ghost">Buscar</button>
      </form>

      {planList.length === 0 && (
        <p className="mb-4 rounded-md border border-brand/40 bg-brand-soft px-4 py-3 text-sm text-brand-light">
          Primero crea al menos un plan en <Link href="/admin/planes" className="font-semibold underline">Planes</Link> para poder asignarlo a los alumnos.
        </p>
      )}

      <div className="space-y-3">
        {list.length === 0 && <p className="py-10 text-center text-muted">No hay usuarios en esta vista.</p>}
        {list.map((u) => (
          <form key={u.id} action={updateUser} className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
            <input type="hidden" name="id" value={u.id} />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={u.full_name || u.email} size={40} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {u.full_name || "(sin nombre)"}
                  <span className={`chip ${STATUS[u.status].cls}`}>{STATUS[u.status].label}</span>
                  {u.role === "admin" && <span className="chip border border-brand/50 text-brand">Admin</span>}
                </p>
                <p className="truncate text-sm text-muted">
                  {u.email}
                  {u.phone && (
                    <>
                      {" · "}
                      <a href={`https://wa.me/${u.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{u.phone}</a>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted/70">Registro {timeAgo(u.created_at)}{u.last_sign_in_at ? ` · último ingreso ${timeAgo(u.last_sign_in_at)}` : ""}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[560px]">
              <select name="status" defaultValue={u.status === "pending" ? "active" : u.status} className="input py-2 text-sm">
                <option value="active">Activo</option>
                <option value="pending">Pendiente</option>
                <option value="blocked">Bloqueado</option>
              </select>
              <select name="plan_id" defaultValue={u.plan_id ?? planList[0]?.id ?? ""} className="input py-2 text-sm">
                <option value="">Sin plan</option>
                {planList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select name="role" defaultValue={u.role} className="input py-2 text-sm" disabled={u.id === me.id}>
                <option value="student">Alumno</option>
                <option value="admin">Admin</option>
              </select>
              {u.id === me.id && <input type="hidden" name="role" value="admin" />}
              <SubmitButton className={u.status === "pending" ? "btn-primary h-10" : "btn-ghost h-10"}>
                {u.status === "pending" ? "Aprobar" : "Guardar"}
              </SubmitButton>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
