import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { createTicket } from "@/app/actions/extras";
import { ActionForm } from "@/components/forms";
import { PageHeader, RichText } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { TICKET_STATUS } from "../support-status";

export const metadata: Metadata = { title: "Soporte" };

type Ticket = { id: string; subject: string; message: string; status: string; admin_reply: string | null; created_at: string; updated_at: string; topic: { label: string; emoji: string | null } | null };

export default async function SupportPage() {
  const { supabase, user } = await requireActive();
  const [{ data: tickets }, { data: topics }] = await Promise.all([
    supabase.from("support_tickets").select("id, subject, message, status, admin_reply, created_at, updated_at, topic:support_topics(label, emoji)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("support_topics").select("id, label, emoji").eq("active", true).order("position"),
  ]);
  const list = (tickets ?? []) as unknown as Ticket[];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Ayuda" title="Soporte" subtitle="Tus solicitudes al equipo y sus respuestas." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {list.length === 0 && <p className="card p-6 text-sm text-muted">Aún no tienes solicitudes. Si necesitas ayuda, escríbenos 👉</p>}
          {list.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg">{t.topic?.emoji ?? "💬"}</span>
                <p className="flex-1 font-semibold">{t.subject}</p>
                <span className={`chip ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{t.topic?.label ? `${t.topic.label} · ` : ""}{timeAgo(t.created_at)}</p>
              <RichText text={t.message} className="mt-3 text-sm text-ink/80" />
              {t.admin_reply && (
                <div className="mt-4 rounded-md border border-brand/40 bg-brand-soft p-4">
                  <p className="label !text-brand">Respuesta del equipo · {timeAgo(t.updated_at)}</p>
                  <RichText text={t.admin_reply} className="text-sm" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="card h-fit p-5">
          <p className="eyebrow mb-4">Nueva solicitud</p>
          <ActionForm action={createTicket} submitLabel="Enviar" pendingText="Enviando…" resetOnSuccess>
            <select name="topic_id" className="input py-2 text-sm" defaultValue="">
              <option value="">Tema (opcional)</option>
              {(topics ?? []).map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
            </select>
            <input name="subject" className="input" placeholder="Asunto" maxLength={140} required />
            <textarea name="message" className="input min-h-32" placeholder="Cuéntanos qué pasa" maxLength={3000} required />
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
