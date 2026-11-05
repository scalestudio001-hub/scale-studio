import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createAnnouncement, deleteAnnouncement } from "@/app/actions/announcements";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Anuncios" };

type Row = {
  id: string; title: string; body: string; link_url: string | null; priority: string; created_at: string;
  announcement_reads: { user_id: string }[];
};

export default async function AdminAnnouncementsPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { count: activeCount }] = await Promise.all([
    supabase.from("announcements").select("id, title, body, link_url, priority, created_at, announcement_reads(user_id)").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const rows = (data ?? []) as Row[];
  const total = activeCount ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {rows.length === 0 && <p className="card p-8 text-center text-muted">Aún no hay anuncios. Crea el primero →</p>}
        {rows.map((a) => {
          const reads = a.announcement_reads.length;
          const pct = total ? Math.min(100, Math.round((reads / total) * 100)) : 0;
          return (
            <div key={a.id} className={`card p-5 ${a.priority === "importante" ? "border-red-500/40" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{a.priority === "importante" ? "📢" : "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.title}
                    {a.priority === "importante" && <span className="chip bg-red-500/90 text-white">Importante</span>}
                  </p>
                  {a.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>}
                  <p className="mt-2 text-xs text-muted">{timeAgo(a.created_at)}{a.link_url ? ` · 🔗 ${a.link_url}` : ""}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted">👀 {reads} de {total} lo vieron</span>
                  </div>
                </div>
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message="¿Eliminar este anuncio?" className="text-xs text-muted hover:text-red-400">🗑️</ConfirmButton>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card h-fit p-5">
        <p className="eyebrow mb-4">Nuevo anuncio</p>
        <ActionForm action={createAnnouncement} submitLabel="Publicar anuncio 🔔" pendingText="Publicando…" resetOnSuccess>
          <input name="title" className="input" placeholder="Ej: Nueva clase disponible 🚀" maxLength={120} required />
          <textarea name="body" className="input min-h-28" placeholder="Detalle del anuncio (opcional)" maxLength={2000} />
          <input name="link_url" className="input" placeholder="Link (opcional): /cursos o https://…" />
          <div>
            <p className="label">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer">
                <input type="radio" name="priority" value="normal" defaultChecked className="peer sr-only" />
                <span className="block rounded-md border border-line p-3 text-sm peer-checked:border-brand peer-checked:bg-brand-soft">
                  🔔 <b>Novedad</b>
                  <span className="mt-1 block text-xs text-muted">Aparece en la campana y salta una alerta.</span>
                </span>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name="priority" value="importante" className="peer sr-only" />
                <span className="block rounded-md border border-line p-3 text-sm peer-checked:border-red-500 peer-checked:bg-red-500/10">
                  📢 <b>Importante</b>
                  <span className="mt-1 block text-xs text-muted">Se abre en pantalla hasta que lo lean.</span>
                </span>
              </label>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="email" className="h-4 w-4 accent-[var(--brand)]" />
            ✉️ Enviar también por correo a todos los alumnos
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
