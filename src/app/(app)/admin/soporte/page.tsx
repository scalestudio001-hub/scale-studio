import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { answerTicket, deleteTopic, saveTopic } from "@/app/actions/extras";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Avatar, RichText } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { TICKET_STATUS } from "../../support-status";

export const metadata: Metadata = { title: "Soporte (admin)" };

type Ticket = {
  id: string; user_id: string; subject: string; message: string; status: string; admin_reply: string | null; created_at: string;
  topic: { label: string; emoji: string | null } | null;
  user: { full_name: string; avatar_url: string | null } | null;
};
type Topic = { id: string; label: string; description: string | null; emoji: string | null; contact_name: string | null; whatsapp: string | null; position: number; active: boolean };

function TopicFields({ t }: { t?: Topic }) {
  return (
    <>
      <div className="grid grid-cols-[64px_1fr] gap-2">
        <input name="emoji" defaultValue={t?.emoji ?? "💬"} className="input px-2 text-center text-lg" maxLength={4} />
        <input name="label" defaultValue={t?.label} className="input" placeholder="Nombre del tema" required />
      </div>
      <input name="description" defaultValue={t?.description ?? ""} className="input" placeholder="Descripción corta" />
      <div className="grid grid-cols-2 gap-2">
        <input name="contact_name" defaultValue={t?.contact_name ?? ""} className="input" placeholder="Quién atiende (ej: Seba)" />
        <input name="whatsapp" defaultValue={t?.whatsapp ?? ""} className="input" placeholder="WhatsApp: 56912345678" />
      </div>
      <div className="grid grid-cols-2 items-center gap-2">
        <input name="position" type="number" defaultValue={t?.position ?? 0} className="input" title="Orden" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={t?.active ?? true} className="h-4 w-4 accent-[var(--brand)]" /> Visible</label>
      </div>
    </>
  );
}

export default async function AdminSupportPage({ searchParams }: PageProps<"/admin/soporte">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const filter = typeof sp.f === "string" ? sp.f : "pendientes";

  const [{ data: tickets }, { data: topics }] = await Promise.all([
    supabase.from("support_tickets").select("id, user_id, subject, message, status, admin_reply, created_at, topic:support_topics(label, emoji), user:profiles!support_tickets_user_id_fkey(full_name, avatar_url)").order("created_at", { ascending: false }).limit(300),
    supabase.from("support_topics").select("*").order("position"),
  ]);
  const all = (tickets ?? []) as unknown as Ticket[];
  const list = filter === "todos" ? all : filter === "resueltos" ? all.filter((t) => t.status === "resuelto") : all.filter((t) => t.status !== "resuelto");
  const open = all.filter((t) => t.status !== "resuelto").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { k: "pendientes", l: `Pendientes (${open})` },
            { k: "resueltos", l: "Resueltos" },
            { k: "todos", l: "Todos" },
          ].map((f) => (
            <Link key={f.k} href={`/admin/soporte?f=${f.k}`} className={`chip h-8 border px-3.5 ${filter === f.k ? "border-brand bg-brand text-on-brand" : "border-line text-muted hover:border-brand"}`}>{f.l}</Link>
          ))}
        </div>
        <div className="space-y-3">
          {list.length === 0 && <p className="card p-8 text-center text-muted">No hay solicitudes aquí 🎉</p>}
          {list.map((t) => (
            <details key={t.id} className="card group" open={t.status === "abierto"}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <Avatar name={t.user?.full_name || "Alumno"} url={t.user?.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.subject}</p>
                  <p className="text-xs text-muted">{t.user?.full_name} · {t.topic ? `${t.topic.emoji} ${t.topic.label} · ` : ""}{timeAgo(t.created_at)}</p>
                </div>
                <span className={`chip ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
              </summary>
              <div className="border-t border-line p-4">
                <RichText text={t.message} className="text-sm text-ink/85" />
                <ActionForm action={answerTicket} submitLabel="Guardar respuesta" className="mt-4 space-y-2" buttonClassName="btn-primary h-10">
                  <input type="hidden" name="id" value={t.id} />
                  <textarea name="admin_reply" defaultValue={t.admin_reply ?? ""} className="input min-h-24 text-sm" placeholder="Respuesta para el alumno (le llega aviso en la campana)" />
                  <select name="status" defaultValue={t.status === "abierto" ? "en_proceso" : t.status} className="input py-2 text-sm">
                    <option value="abierto">Abierto</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </ActionForm>
                <Link href={`/miembros/${t.user_id}`} className="mt-2 inline-block text-xs text-brand">Ver perfil del alumno →</Link>
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <p className="eyebrow mb-2">Temas del botón de soporte</p>
          <p className="mb-4 text-xs text-muted">Cada tema aparece en el botón 💬. Si le pones WhatsApp, el alumno puede escribir directo a quien atiende.</p>
          <div className="space-y-2">
            {((topics ?? []) as Topic[]).map((t) => (
              <details key={t.id} className="rounded-md border border-line">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm">
                  <span>{t.emoji}</span>
                  <span className={`flex-1 font-semibold ${t.active ? "" : "text-muted line-through"}`}>{t.label}</span>
                  {t.whatsapp && <span className="text-xs text-emerald-400">WhatsApp</span>}
                </summary>
                <div className="border-t border-line p-3">
                  <ActionForm action={saveTopic} submitLabel="Guardar" className="space-y-2" buttonClassName="btn-ghost h-9 w-full">
                    <input type="hidden" name="id" value={t.id} />
                    <TopicFields t={t} />
                  </ActionForm>
                  <form action={deleteTopic} className="mt-2">
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton message={`¿Eliminar el tema "${t.label}"?`} className="text-xs text-muted hover:text-red-400">Eliminar tema</ConfirmButton>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="eyebrow mb-4">Nuevo tema</p>
          <ActionForm action={saveTopic} submitLabel="Agregar tema" className="space-y-2" resetOnSuccess>
            <TopicFields />
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
