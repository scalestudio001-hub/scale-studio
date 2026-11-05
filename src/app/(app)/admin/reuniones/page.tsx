import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { cancelMeeting } from "@/app/actions/meetings";
import { ConfirmButton } from "@/components/forms";
import { Avatar } from "@/components/ui";
import { fmtDateTime, isoFromNow } from "@/lib/time";
import type { AdminUser } from "@/lib/types";
import { MeetingEditor } from "../../reuniones/meeting-editor";
import { StatusChip, STATUS_LABEL } from "../../reuniones/status";
import { loadMeetings } from "./data";

export const metadata: Metadata = { title: "Registro de reuniones" };

export default async function MeetingsRegistry({ searchParams }: PageProps<"/admin/reuniones">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const [{ rows, filters }, { data: users }] = await Promise.all([loadMeetings(sp), supabase.rpc("admin_list_users")]);
  const team = ((users ?? []) as AdminUser[]).filter((u) => u.role === "admin");

  const now = isoFromNow();
  const past = rows.filter((r) => r.status !== "cancelada" && r.ends_at < now);
  const done = rows.filter((r) => r.status === "realizada").length;
  const noShow = rows.filter((r) => r.status === "no_asistio").length;
  const cancelled = rows.filter((r) => r.status === "cancelada").length;
  const upcoming = rows.filter((r) => r.status === "agendada" && r.ends_at >= now).length;
  const pendingReg = past.filter((r) => r.status === "agendada").length;
  const attendance = done + noShow ? Math.round((done / (done + noShow)) * 100) : null;

  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v).map(([k, v]) => [k === "month" ? "mes" : k, v as string])).toString();

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { l: "Total", v: rows.length },
          { l: "Próximas", v: upcoming },
          { l: "Realizadas", v: done },
          { l: "No asistió", v: noShow },
          { l: "Canceladas", v: cancelled },
          { l: "Asistencia", v: attendance === null ? "—" : `${attendance}%` },
        ].map((k) => (
          <div key={k.l} className="card p-4">
            <p className="label">{k.l}</p>
            <p className="font-display text-3xl font-semibold">{k.v}</p>
          </div>
        ))}
      </div>

      {pendingReg > 0 && (
        <p className="mb-4 rounded-md border border-brand/40 bg-brand-soft px-4 py-3 text-sm text-brand-light">
          ⚠️ Hay {pendingReg} {pendingReg === 1 ? "reunión que ya pasó" : "reuniones que ya pasaron"} y siguen como “Agendada”. Márcalas como Realizada o No asistió.
        </p>
      )}

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto_auto]">
        <select name="coach" defaultValue={filters.coach} className="input py-2 text-sm">
          <option value="">Todos los coaches</option>
          {team.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        <select name="status" defaultValue={filters.status} className="input py-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="month" name="mes" defaultValue={filters.month} className="input py-2 text-sm" />
        <input name="q" defaultValue={filters.q} className="input py-2 text-sm" placeholder="Buscar alumno o tema…" />
        <button className="btn-ghost h-10">Filtrar</button>
        <a href={`/admin/reuniones/export${qs ? `?${qs}` : ""}`} className="btn-outline h-10">⬇ Excel (CSV)</a>
      </form>

      {rows.length === 0 && <p className="card p-8 text-center text-muted">No hay reuniones con estos filtros.</p>}

      <div className="space-y-2">
        {rows.map((r) => (
          <details key={r.id} className="card group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={r.student?.full_name || "Alumno"} url={r.student?.avatar_url} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {r.student?.full_name} <span className="font-normal text-muted">con</span> {r.coach?.full_name}
                </p>
                <p className="text-xs capitalize text-muted">{fmtDateTime(r.starts_at)}</p>
              </div>
              <span className="hidden max-w-xs truncate text-sm text-muted md:block">{r.topic}</span>
              {r.coach_notes && <span title="Tiene notas">📝</span>}
              <StatusChip status={r.status} />
              <span className="text-muted transition group-open:rotate-90">›</span>
            </summary>
            <div className="border-t border-line px-4 pb-4 pt-3">
              {r.topic && <p className="text-sm text-ink/85"><b>Tema:</b> {r.topic}</p>}
              <p className="mt-1 text-xs text-muted">Agendada el {fmtDateTime(r.created_at)}</p>
              <MeetingEditor m={r} />
              {r.status === "agendada" && (
                <form action={cancelMeeting} className="mt-2">
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmButton message="¿Cancelar esta reunión? Se avisará por correo al alumno." className="text-xs text-muted hover:text-red-400">
                    Cancelar y avisar al alumno
                  </ConfirmButton>
                </form>
              )}
            </div>
          </details>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">
        Para publicar horarios ve a <Link href="/reuniones/agenda" className="text-brand underline">Mi agenda de coach</Link>.
      </p>
    </>
  );
}
